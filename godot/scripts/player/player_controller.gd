extends CharacterBody2D

# Movement constants (updated for larger tiles)
const WALK_SPEED = 100.0
const SPRINT_SPEED = 175.0
const SNEAK_SPEED = 50.0
const ACCELERATION = 800.0
const FRICTION = 1200.0

# Grid/screen conversion (Project Zomboid scale)
const TILE_WIDTH = 128
const TILE_HEIGHT = 64
const HALF_TILE_WIDTH = 64
const HALF_TILE_HEIGHT = 32
const ELEVATION_STEP = 16

# Animation constants (PZ character dimensions)
const SPRITE_WIDTH = 64
const SPRITE_HEIGHT = 116
const WALK_FRAME_DURATION = 0.15
const SPRINT_FRAME_DURATION = 0.1
const WALK_FRAMES = 4

# PZ Character proportions (in 64x116 canvas, realistic 7.5 heads tall)
const HEAD_WIDTH_FRONT = 12
const HEAD_WIDTH_SIDE = 8
const HEAD_HEIGHT = 15
const NECK_HEIGHT = 4
const TORSO_WIDTH_FRONT = 20
const TORSO_WIDTH_SIDE = 12
const TORSO_HEIGHT = 28
const ARM_WIDTH = 6
const ARM_LENGTH = 30
const LEG_WIDTH_FRONT = 8
const LEG_WIDTH_SIDE = 5
const LEG_HEIGHT = 34

# References
@onready var sprite: Sprite2D = $Sprite2D
@onready var camera: Camera2D = $Camera2D
@onready var animation_player: AnimationPlayer = $AnimationPlayer if has_node("AnimationPlayer") else null
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

# State
var grid_x: float = 128.0
var grid_y: float = 128.0
var current_direction: String = "S"
var is_moving: bool = false
var is_sprinting: bool = false
var is_sneaking: bool = false

# Walkability grid (set by world)
var walkability_grid = []  # PackedByteArray or Array
var elevation_grid = []  # PackedFloat32Array or Array
var world_size: int = 256

# Animation state
var anim_frames: Dictionary = {}  # {"N": [frame0, frame1, frame2, frame3, frame4], "NE": [...], etc.}
var current_frame: int = 0
var frame_timer: float = 0.0
var shadow_texture: ImageTexture

# Color palette (Project Zomboid-like, muted survivalist tones)
const COLOR_SKIN = Color(0.85, 0.72, 0.58, 1.0)
const COLOR_HAIR = Color(0.25, 0.18, 0.12, 1.0)
const COLOR_SHIRT = Color(0.35, 0.42, 0.32, 1.0)  # Muted green-grey
const COLOR_PANTS = Color(0.18, 0.20, 0.28, 1.0)  # Dark navy
const COLOR_BOOTS = Color(0.22, 0.18, 0.15, 1.0)  # Dark brown-black
const COLOR_BELT = Color(0.3, 0.22, 0.15, 1.0)  # Dark leather
const COLOR_SHADOW = Color(0.0, 0.0, 0.0, 0.3)
const COLOR_OUTLINE = Color(0.1, 0.1, 0.1, 1.0)

func _ready():
	# Add to player group so HUD and other systems can find us
	add_to_group("player")

	# Create procedural player sprite with animations
	if sprite:
		generate_character_frames()
		create_shadow_texture()
	else:
		push_warning("Player: Sprite2D not found, cannot create texture")

	# Sync with GameState
	var gs = get_node("/root/GameState") if has_node("/root/GameState") else null
	if gs:
		grid_x = gs.player_grid_x
		grid_y = gs.player_grid_y
		current_direction = gs.player_direction
	update_screen_position()

func _physics_process(delta: float):
	var gs = get_node("/root/GameState") if has_node("/root/GameState") else null

	# Get input direction (WASD mapped to isometric)
	var input_vector = get_isometric_input()

	# Determine movement speed
	var target_speed = WALK_SPEED
	is_sprinting = Input.is_action_pressed("sprint") and not is_sneaking
	is_sneaking = Input.is_action_pressed("sneak") and not is_sprinting

	if is_sprinting:
		target_speed = SPRINT_SPEED
		# Drain fatigue
		if gs:
			gs.modify_stat("fatigue", -delta * 3.0)
	elif is_sneaking:
		target_speed = SNEAK_SPEED

	# Calculate velocity
	if input_vector.length() > 0:
		input_vector = input_vector.normalized()
		is_moving = true

		# Convert to grid delta (pixels to grid units)
		var grid_delta = input_vector * target_speed * delta / TILE_WIDTH
		var new_grid_x = grid_x + grid_delta.x
		var new_grid_y = grid_y + grid_delta.y

		# Check walkability
		if is_walkable(int(new_grid_x), int(new_grid_y)):
			grid_x = new_grid_x
			grid_y = new_grid_y

			# Update direction (8-way)
			current_direction = get_direction_from_input(input_vector)

			# Sync to GameState
			if gs:
				gs.player_grid_x = grid_x
				gs.player_grid_y = grid_y
				gs.player_direction = current_direction
				gs.player_moving = true
				gs.player_sprinting = is_sprinting
				gs.player_sneaking = is_sneaking

		velocity = velocity.move_toward(input_vector * target_speed, ACCELERATION * delta)
	else:
		is_moving = false
		velocity = velocity.move_toward(Vector2.ZERO, FRICTION * delta)
		if gs:
			gs.player_moving = false

	# Update screen position
	update_screen_position()

	# Update animation
	update_animation(delta)

	# Move (for collision detection if needed)
	move_and_slide()

func get_isometric_input() -> Vector2:
	# WASD to isometric grid coordinates
	# W = NW (-x, -y), S = SE (+x, +y), A = SW (-x, +y), D = NE (+x, -y)
	var input = Vector2.ZERO

	if Input.is_action_pressed("move_up"):  # W
		input.x -= 1.0
		input.y -= 1.0
	if Input.is_action_pressed("move_down"):  # S
		input.x += 1.0
		input.y += 1.0
	if Input.is_action_pressed("move_left"):  # A
		input.x -= 1.0
		input.y += 1.0
	if Input.is_action_pressed("move_right"):  # D
		input.x += 1.0
		input.y -= 1.0

	return input

func get_direction_from_input(input_vec: Vector2) -> String:
	# Convert input vector to 8-way direction
	var angle = input_vec.angle()
	var deg = rad_to_deg(angle)

	# Normalize to 0-360
	if deg < 0:
		deg += 360

	# 8 directions (45 degree slices)
	if deg >= 337.5 or deg < 22.5:
		return "E"
	elif deg >= 22.5 and deg < 67.5:
		return "SE"
	elif deg >= 67.5 and deg < 112.5:
		return "S"
	elif deg >= 112.5 and deg < 157.5:
		return "SW"
	elif deg >= 157.5 and deg < 202.5:
		return "W"
	elif deg >= 202.5 and deg < 247.5:
		return "NW"
	elif deg >= 247.5 and deg < 292.5:
		return "N"
	else:  # 292.5 to 337.5
		return "NE"

func update_screen_position():
	# Isometric grid to screen coordinates (NEW larger tile formula)
	var elev = get_elevation(int(grid_x), int(grid_y))
	var screen_x = (grid_x - grid_y) * 64  # Changed from 32
	var screen_y = (grid_x + grid_y) * 32  # Changed from 16
	screen_y -= elev * 16.0  # Changed from 8.0

	# Smooth interpolation
	global_position = global_position.lerp(Vector2(screen_x, screen_y), 0.3)

func get_elevation(gx: int, gy: int) -> float:
	if gx < 0 or gy < 0 or gx >= world_size or gy >= world_size:
		return 0.0
	if elevation_grid.size() == 0:
		return 0.0
	var idx = gy * world_size + gx
	if idx >= 0 and idx < elevation_grid.size():
		return elevation_grid[idx]
	return 0.0

func is_walkable(gx: int, gy: int) -> bool:
	if gx < 0 or gy < 0 or gx >= world_size or gy >= world_size:
		return false
	if walkability_grid.size() == 0:
		return true  # No grid loaded yet, allow movement
	var idx = gy * world_size + gx
	if idx >= 0 and idx < walkability_grid.size():
		return walkability_grid[idx] == 1  # PackedByteArray returns int, not bool
	return false

func update_animation(delta: float):
	# Update animation frame based on movement state
	if not sprite:
		return

	if is_moving:
		# Advance frame timer
		var frame_duration = SPRINT_FRAME_DURATION if is_sprinting else WALK_FRAME_DURATION
		frame_timer += delta

		if frame_timer >= frame_duration:
			frame_timer = 0.0
			current_frame = (current_frame + 1) % (WALK_FRAMES + 1)
			if current_frame == 0:
				current_frame = 1  # Skip idle frame, cycle 1-4
	else:
		# Reset to idle frame
		current_frame = 0
		frame_timer = 0.0

	# Update sprite texture to current frame
	if anim_frames.has(current_direction) and current_frame < anim_frames[current_direction].size():
		sprite.texture = anim_frames[current_direction][current_frame]

func set_walkability_grid(grid, size: int):
	walkability_grid = grid
	world_size = size

func set_elevation_grid(grid, size: int):
	elevation_grid = grid
	world_size = size

func teleport_to(gx: float, gy: float):
	grid_x = gx
	grid_y = gy
	var gs = get_node("/root/GameState") if has_node("/root/GameState") else null
	if gs:
		gs.player_grid_x = gx
		gs.player_grid_y = gy
	update_screen_position()

func generate_character_frames():
	# Generate all animation frames for all 8 directions with Project Zomboid quality
	var directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

	for direction in directions:
		anim_frames[direction] = []

		# Generate idle + 4 walk frames
		for frame_num in range(WALK_FRAMES + 1):
			var img = create_character_frame(direction, frame_num)
			var texture = ImageTexture.create_from_image(img)
			anim_frames[direction].append(texture)

	# Set initial texture (idle, facing south)
	if anim_frames.has("S") and anim_frames["S"].size() > 0:
		sprite.texture = anim_frames["S"][0]
		sprite.centered = true

func create_character_frame(direction: String, frame_num: int) -> Image:
	# Create a single animation frame with PZ-quality direction-specific body rendering
	var img = Image.create(SPRITE_WIDTH, SPRITE_HEIGHT, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))  # Transparent background

	# Calculate body part positions based on direction and frame
	var parts = calculate_body_parts(direction, frame_num)

	# Draw shadow first (beneath character)
	draw_shadow(img, parts)

	# Draw body parts in correct Z-order based on direction
	var draw_order = get_draw_order(direction)
	for part_name in draw_order:
		if parts.has(part_name):
			draw_body_part(img, part_name, parts[part_name], direction)

	# Add outline for PZ crispness
	add_outline(img)

	return img

func calculate_body_parts(direction: String, frame_num: int) -> Dictionary:
	# Returns body part positions with TRUE Project Zomboid directional sizing
	# Side views (E/W) = NARROW body, Front/Back (S/N) = WIDE body, 3/4 views = MEDIUM

	var parts = {}
	var center_x = SPRITE_WIDTH / 2.0
	var base_y = SPRITE_HEIGHT - 10  # Feet position

	# Calculate walk cycle phase (-1 to 1 for alternating legs/arms)
	var walk_phase = 0.0
	if frame_num > 0:
		if frame_num == 1:
			walk_phase = -1.0  # Left stride
		elif frame_num == 2:
			walk_phase = 0.0   # Passing position
		elif frame_num == 3:
			walk_phase = 1.0   # Right stride
		elif frame_num == 4:
			walk_phase = 0.0   # Passing position

	# Vertical bob during walk (up when legs cross)
	var bob_offset = 0
	if frame_num == 2 or frame_num == 4:
		bob_offset = -2  # Bob UP during passing

	# DIRECTION-SPECIFIC BODY DIMENSIONS (THE KEY TO PZ LOOK)
	var head_width = HEAD_WIDTH_FRONT
	var head_height = HEAD_HEIGHT
	var torso_width = TORSO_WIDTH_FRONT
	var torso_height = TORSO_HEIGHT
	var neck_width = 6
	var show_face = false
	var show_back = false

	# Determine body shape based on viewing angle
	if direction in ["E", "W"]:
		# SIDE PROFILE - NARROW body (key PZ characteristic)
		head_width = HEAD_WIDTH_SIDE
		torso_width = TORSO_WIDTH_SIDE
		neck_width = 4
		show_face = true  # Side profile always shows face features
	elif direction in ["SE", "SW", "NE", "NW"]:
		# 3/4 VIEW - medium body width
		head_width = 10
		torso_width = 16
		neck_width = 5
		show_face = (direction in ["SE", "SW"])
		show_back = (direction in ["NE", "NW"])
	elif direction == "S":
		# FRONT VIEW - full body width, face visible
		head_width = HEAD_WIDTH_FRONT
		torso_width = TORSO_WIDTH_FRONT
		neck_width = 6
		show_face = true
	else:  # N
		# BACK VIEW - full body width, back of head
		head_width = HEAD_WIDTH_FRONT
		torso_width = TORSO_WIDTH_FRONT
		neck_width = 6
		show_back = true

	# HEAD - positioned at top (PZ characters: head is ~15px tall)
	var head_y = 15 + bob_offset
	parts["head"] = {
		"x": center_x,
		"y": head_y,
		"width": head_width,
		"height": head_height,
		"show_face": show_face,
		"show_back": show_back,
		"direction": direction
	}

	# NECK - connects head to torso
	var neck_y = head_y + head_height
	parts["neck"] = {
		"x": center_x - neck_width / 2.0,
		"y": neck_y,
		"width": neck_width,
		"height": NECK_HEIGHT
	}

	# TORSO - width varies dramatically by direction (PZ-style)
	var torso_y = neck_y + NECK_HEIGHT
	parts["torso"] = {
		"x": center_x - torso_width / 2.0,
		"y": torso_y,
		"width": torso_width,
		"height": torso_height,
		"show_back": show_back,
		"direction": direction
	}

	# BELT - matches torso width
	var belt_y = torso_y + torso_height - 2
	parts["belt"] = {
		"x": center_x - torso_width / 2.0,
		"y": belt_y,
		"width": torso_width,
		"height": 2
	}

	# ARMS - visibility and position based on viewing angle (PZ: ~30px long)
	var arm_swing = walk_phase * 6.0
	var arm_y_base = torso_y + 4

	if direction == "S":
		# SOUTH - Front view, both arms visible at sides
		parts["left_arm"] = {
			"x": center_x - torso_width / 2.0 - 2,
			"y": arm_y_base - arm_swing,  # Opposite of right leg
			"width": ARM_WIDTH,
			"height": ARM_LENGTH,
			"sleeve_height": 12
		}
		parts["right_arm"] = {
			"x": center_x + torso_width / 2.0 - 4,
			"y": arm_y_base + arm_swing,  # Opposite of left leg
			"width": ARM_WIDTH,
			"height": ARM_LENGTH,
			"sleeve_height": 12
		}
	elif direction == "N":
		# NORTH - Back view, both arms visible (back of arms)
		parts["left_arm"] = {
			"x": center_x - torso_width / 2.0 - 1,
			"y": arm_y_base + arm_swing,
			"width": ARM_WIDTH,
			"height": ARM_LENGTH - 4,
			"sleeve_height": 12
		}
		parts["right_arm"] = {
			"x": center_x + torso_width / 2.0 - 5,
			"y": arm_y_base - arm_swing,
			"width": ARM_WIDTH,
			"height": ARM_LENGTH - 4,
			"sleeve_height": 12
		}
	elif direction == "E":
		# EAST - Right side profile, only right arm visible
		parts["right_arm"] = {
			"x": center_x + 2,
			"y": arm_y_base + arm_swing,
			"width": ARM_WIDTH,
			"height": ARM_LENGTH,
			"sleeve_height": 12
		}
	elif direction == "W":
		# WEST - Left side profile, only left arm visible
		parts["left_arm"] = {
			"x": center_x - ARM_WIDTH - 2,
			"y": arm_y_base + arm_swing,
			"width": ARM_WIDTH,
			"height": ARM_LENGTH,
			"sleeve_height": 12
		}
	elif direction == "SE":
		# SOUTHEAST - 3/4 front-right, right arm more prominent
		parts["left_arm"] = {
			"x": center_x - torso_width / 2.0 - 1,
			"y": arm_y_base - arm_swing * 0.7,
			"width": ARM_WIDTH - 1,  # Partially hidden
			"height": ARM_LENGTH - 2,
			"sleeve_height": 11
		}
		parts["right_arm"] = {
			"x": center_x + torso_width / 2.0 - 4,
			"y": arm_y_base + arm_swing,
			"width": ARM_WIDTH,
			"height": ARM_LENGTH,
			"sleeve_height": 12
		}
	elif direction == "SW":
		# SOUTHWEST - 3/4 front-left, left arm more prominent
		parts["left_arm"] = {
			"x": center_x - torso_width / 2.0 - 2,
			"y": arm_y_base - arm_swing,
			"width": ARM_WIDTH,
			"height": ARM_LENGTH,
			"sleeve_height": 12
		}
		parts["right_arm"] = {
			"x": center_x + torso_width / 2.0 - 5,
			"y": arm_y_base + arm_swing * 0.7,
			"width": ARM_WIDTH - 1,  # Partially hidden
			"height": ARM_LENGTH - 2,
			"sleeve_height": 11
		}
	elif direction == "NE":
		# NORTHEAST - 3/4 back-right
		parts["left_arm"] = {
			"x": center_x - torso_width / 2.0 - 1,
			"y": arm_y_base + arm_swing * 0.7,
			"width": ARM_WIDTH - 1,
			"height": ARM_LENGTH - 4,
			"sleeve_height": 11
		}
		parts["right_arm"] = {
			"x": center_x + torso_width / 2.0 - 4,
			"y": arm_y_base - arm_swing,
			"width": ARM_WIDTH,
			"height": ARM_LENGTH - 4,
			"sleeve_height": 12
		}
	else:  # NW
		# NORTHWEST - 3/4 back-left
		parts["left_arm"] = {
			"x": center_x - torso_width / 2.0 - 2,
			"y": arm_y_base + arm_swing,
			"width": ARM_WIDTH,
			"height": ARM_LENGTH - 4,
			"sleeve_height": 12
		}
		parts["right_arm"] = {
			"x": center_x + torso_width / 2.0 - 5,
			"y": arm_y_base - arm_swing * 0.7,
			"width": ARM_WIDTH - 1,
			"height": ARM_LENGTH - 4,
			"sleeve_height": 11
		}

	# HANDS - attached to visible arms (PZ: small, 2-3px)
	if parts.has("left_arm"):
		var la = parts["left_arm"]
		parts["left_hand"] = {
			"x": la.x + la.width / 2.0 - 2,
			"y": la.y + la.height,
			"width": 4,
			"height": 4
		}
	if parts.has("right_arm"):
		var ra = parts["right_arm"]
		parts["right_hand"] = {
			"x": ra.x + ra.width / 2.0 - 2,
			"y": ra.y + ra.height,
			"width": 4,
			"height": 4
		}

	# LEGS - stride animation depends on viewing angle (PZ: ~34px tall)
	var leg_y_base = torso_y + torso_height
	var leg_width = LEG_WIDTH_FRONT
	var leg_height = LEG_HEIGHT

	if direction in ["E", "W"]:
		# SIDE VIEW - legs overlap with forward/back stride
		leg_width = LEG_WIDTH_SIDE
		var leg_stride = walk_phase * 5.0  # Forward/back offset

		# Back leg (further from viewer)
		parts["back_leg"] = {
			"x": center_x - leg_width / 2.0,
			"y": leg_y_base - leg_stride,
			"width": leg_width,
			"height": leg_height,
			"side_view": true,
			"is_back": true
		}
		# Front leg (closer to viewer)
		parts["front_leg"] = {
			"x": center_x - leg_width / 2.0 + 1,
			"y": leg_y_base + leg_stride,
			"width": leg_width,
			"height": leg_height,
			"side_view": true,
			"is_back": false
		}
	else:
		# FRONT/BACK/3-4 VIEWS - legs side by side
		var leg_swing = walk_phase * 5.0
		parts["left_leg"] = {
			"x": center_x - leg_width - 1,
			"y": leg_y_base - leg_swing,
			"width": leg_width,
			"height": leg_height,
			"side_view": false
		}
		parts["right_leg"] = {
			"x": center_x + 1,
			"y": leg_y_base + leg_swing,
			"width": leg_width,
			"height": leg_height,
			"side_view": false
		}

	# FEET/BOOTS - match leg positions (PZ: visible boots)
	if parts.has("left_leg"):
		var ll = parts["left_leg"]
		parts["left_foot"] = {
			"x": ll.x,
			"y": base_y - 6,
			"width": leg_width,
			"height": 6
		}
	if parts.has("right_leg"):
		var rl = parts["right_leg"]
		parts["right_foot"] = {
			"x": rl.x,
			"y": base_y - 6,
			"width": leg_width,
			"height": 6
		}
	if parts.has("back_leg"):
		var bl = parts["back_leg"]
		parts["back_foot"] = {
			"x": bl.x,
			"y": base_y - 6,
			"width": leg_width,
			"height": 6
		}
	if parts.has("front_leg"):
		var fl = parts["front_leg"]
		parts["front_foot"] = {
			"x": fl.x,
			"y": base_y - 6,
			"width": leg_width,
			"height": 6
		}

	return parts

func get_draw_order(direction: String) -> Array:
	# Return body parts in correct Z-order based on viewing direction
	if direction == "N":
		# North - back view
		return ["left_foot", "right_foot", "left_leg", "right_leg", "belt", "torso",
				"left_arm", "right_arm", "left_hand", "right_hand", "neck", "head"]
	elif direction == "S":
		# South - front view
		return ["head", "neck", "torso", "belt", "left_arm", "right_arm",
				"left_hand", "right_hand", "left_leg", "right_leg", "left_foot", "right_foot"]
	elif direction == "E":
		# East - right side
		return ["back_foot", "back_leg", "head", "neck", "torso", "belt",
				"right_arm", "right_hand", "front_leg", "front_foot"]
	elif direction == "W":
		# West - left side
		return ["back_foot", "back_leg", "head", "neck", "torso", "belt",
				"left_arm", "left_hand", "front_leg", "front_foot"]
	elif direction == "SE":
		# Southeast - 3/4 front-right
		return ["head", "neck", "left_arm", "left_hand", "torso", "belt",
				"right_arm", "right_hand", "left_leg", "right_leg", "left_foot", "right_foot"]
	elif direction == "SW":
		# Southwest - 3/4 front-left
		return ["head", "neck", "right_arm", "right_hand", "torso", "belt",
				"left_arm", "left_hand", "right_leg", "left_leg", "right_foot", "left_foot"]
	elif direction == "NE":
		# Northeast - 3/4 back-right
		return ["left_leg", "right_leg", "left_foot", "right_foot", "belt", "torso",
				"left_arm", "right_arm", "left_hand", "right_hand", "neck", "head"]
	else:  # NW
		# Northwest - 3/4 back-left
		return ["right_leg", "left_leg", "right_foot", "left_foot", "belt", "torso",
				"right_arm", "left_arm", "right_hand", "left_hand", "neck", "head"]

func draw_body_part(img: Image, part_name: String, part_data: Dictionary, direction: String):
	# Draw a single body part with Project Zomboid quality pixel art detail

	if part_name == "head":
		draw_head(img, part_data, direction)
	elif part_name == "neck":
		draw_neck(img, part_data)
	elif part_name == "torso":
		draw_torso(img, part_data, direction)
	elif part_name == "belt":
		draw_belt(img, part_data)
	elif part_name in ["left_arm", "right_arm"]:
		draw_arm(img, part_data)
	elif part_name in ["left_hand", "right_hand"]:
		draw_hand(img, part_data)
	elif part_name in ["left_leg", "right_leg", "back_leg", "front_leg"]:
		draw_leg(img, part_data)
	elif part_name in ["left_foot", "right_foot", "back_foot", "front_foot"]:
		draw_boot(img, part_data)

func draw_head(img: Image, data: Dictionary, direction: String):
	# Draw head with PZ-quality direction-specific shape and features
	var hx = int(data.x - data.width / 2.0)
	var hy = int(data.y)
	var hw = int(data.width)
	var hh = int(data.height)

	var skin = COLOR_SKIN
	var hair = COLOR_HAIR

	# Draw oval head shape
	for py in range(hy, hy + hh):
		for px in range(hx, hx + hw):
			if px >= 0 and px < SPRITE_WIDTH and py >= 0 and py < SPRITE_HEIGHT:
				# Oval formula
				var nx = (px - (hx + hw / 2.0)) / (hw / 2.0)
				var ny = (py - (hy + hh / 2.0)) / (hh / 2.0)
				if nx * nx + ny * ny <= 1.0:
					var col = skin

					# Hair placement depends on view
					if data.has("show_back") and data.show_back:
						# BACK OF HEAD - more hair coverage
						if py < hy + hh * 0.65:
							col = hair
					else:
						# FRONT/SIDE - hair on top
						if py < hy + hh * 0.5:
							col = hair

					# Subtle shading for depth
					if nx < 0 and ny < 0:
						col = col.lightened(0.08)
					elif nx > 0 and ny > 0:
						col = col.darkened(0.12)

					img.set_pixel(px, py, col)

	# Draw facial features ONLY when face is visible
	if data.has("show_face") and data.show_face:
		var face_y = hy + hh / 2

		if direction == "S":
			# FRONT VIEW - both eyes, nose, mouth
			var eye_y = int(face_y + 2)
			var left_eye_x = hx + 3
			var right_eye_x = hx + hw - 4

			# Eyes (2px each)
			if left_eye_x >= 0 and left_eye_x + 1 < SPRITE_WIDTH and eye_y >= 0 and eye_y < SPRITE_HEIGHT:
				img.set_pixel(left_eye_x, eye_y, Color(0.1, 0.08, 0.06))
				img.set_pixel(left_eye_x + 1, eye_y, Color(0.1, 0.08, 0.06))
			if right_eye_x >= 0 and right_eye_x + 1 < SPRITE_WIDTH and eye_y >= 0 and eye_y < SPRITE_HEIGHT:
				img.set_pixel(right_eye_x, eye_y, Color(0.1, 0.08, 0.06))
				img.set_pixel(right_eye_x + 1, eye_y, Color(0.1, 0.08, 0.06))

			# Nose
			var nose_x = hx + hw / 2
			var nose_y = int(face_y + 4)
			if nose_x >= 0 and nose_x < SPRITE_WIDTH and nose_y >= 0 and nose_y + 1 < SPRITE_HEIGHT:
				img.set_pixel(nose_x, nose_y, skin.darkened(0.25))
				img.set_pixel(nose_x, nose_y + 1, skin.darkened(0.15))

		elif direction in ["SE", "SW"]:
			# 3/4 VIEW - one eye visible, nose shifted
			var eye_y = int(face_y + 2)
			var eye_x = hx + (3 if direction == "SE" else hw - 5)

			if eye_x >= 0 and eye_x + 1 < SPRITE_WIDTH and eye_y >= 0 and eye_y < SPRITE_HEIGHT:
				img.set_pixel(eye_x, eye_y, Color(0.1, 0.08, 0.06))
				img.set_pixel(eye_x + 1, eye_y, Color(0.1, 0.08, 0.06))

			# Nose slightly off-center
			var nose_x = hx + hw / 2 + (2 if direction == "SE" else -2)
			var nose_y = int(face_y + 4)
			if nose_x >= 0 and nose_x < SPRITE_WIDTH and nose_y >= 0 and nose_y + 1 < SPRITE_HEIGHT:
				img.set_pixel(nose_x, nose_y, skin.darkened(0.25))

		elif direction in ["E", "W"]:
			# SIDE PROFILE - one eye, nose protrudes
			var eye_y = int(face_y + 2)
			var eye_x = hx + (2 if direction == "E" else hw - 3)

			if eye_x >= 0 and eye_x + 1 < SPRITE_WIDTH and eye_y >= 0 and eye_y < SPRITE_HEIGHT:
				img.set_pixel(eye_x, eye_y, Color(0.1, 0.08, 0.06))

			# Nose protrusion
			var nose_x = (hx + hw if direction == "E" else hx - 1)
			var nose_y = int(face_y + 3)
			if nose_x >= 0 and nose_x < SPRITE_WIDTH and nose_y >= 0 and nose_y + 1 < SPRITE_HEIGHT:
				img.set_pixel(nose_x, nose_y, skin.darkened(0.3))

			# Ear on side of head
			var ear_x = hx + (hw - 1 if direction == "W" else 0)
			var ear_y = int(face_y)
			if ear_x >= 0 and ear_x < SPRITE_WIDTH and ear_y >= 0 and ear_y + 2 < SPRITE_HEIGHT:
				img.set_pixel(ear_x, ear_y, skin.darkened(0.2))
				img.set_pixel(ear_x, ear_y + 1, skin.darkened(0.2))

func draw_neck(img: Image, data: Dictionary):
	# Draw neck with skin tone
	var nx = int(data.x)
	var ny = int(data.y)
	var nw = int(data.width)
	var nh = int(data.height)

	draw_solid_rect(img, nx, ny, nw, nh, COLOR_SKIN.darkened(0.1))

func draw_torso(img: Image, data: Dictionary, direction: String):
	# Draw torso with PZ-quality direction-specific details
	var tx = int(data.x)
	var ty = int(data.y)
	var tw = int(data.width)
	var th = int(data.height)

	var shirt = COLOR_SHIRT

	# Fill base shirt
	draw_solid_rect(img, tx, ty, tw, th, shirt)

	# Collar at top (darker)
	var collar = shirt.darkened(0.35)
	for px in range(tx, tx + tw):
		if px >= 0 and px < SPRITE_WIDTH and ty >= 0 and ty + 1 < SPRITE_HEIGHT:
			img.set_pixel(px, ty, collar)
			img.set_pixel(px, ty + 1, collar)

	# Direction-specific details
	var show_back = data.has("show_back") and data.show_back

	if not show_back and tw >= 12:
		# FRONT VIEW - button line and pockets
		var center_x = tx + tw / 2
		for py in range(ty + 3, ty + th - 2):
			if center_x >= 0 and center_x < SPRITE_WIDTH and py >= 0 and py < SPRITE_HEIGHT:
				img.set_pixel(center_x, py, shirt.darkened(0.3))

		# Chest pocket (right side)
		var pocket_x = tx + tw - 6
		var pocket_y = ty + 5
		if pocket_x >= 0 and pocket_x + 4 < SPRITE_WIDTH:
			for py in range(pocket_y, min(pocket_y + 4, ty + th)):
				for px in range(pocket_x, min(pocket_x + 4, tx + tw)):
					if px >= 0 and px < SPRITE_WIDTH and py >= 0 and py < SPRITE_HEIGHT:
						img.set_pixel(px, py, shirt.darkened(0.25))
	elif show_back and tw >= 12:
		# BACK VIEW - shoulder blade shadows
		var blade_left_x = tx + 3
		var blade_right_x = tx + tw - 4
		for py in range(ty + 5, ty + 12):
			if py >= 0 and py < SPRITE_HEIGHT:
				if blade_left_x >= 0 and blade_left_x + 1 < SPRITE_WIDTH:
					img.set_pixel(blade_left_x, py, shirt.darkened(0.2))
					img.set_pixel(blade_left_x + 1, py, shirt.darkened(0.15))
				if blade_right_x >= 0 and blade_right_x + 1 < SPRITE_WIDTH:
					img.set_pixel(blade_right_x, py, shirt.darkened(0.2))
					img.set_pixel(blade_right_x + 1, py, shirt.darkened(0.15))

	# Shoulder seams
	for py in range(ty, ty + 4):
		if py >= 0 and py < SPRITE_HEIGHT:
			if tx >= 0 and tx < SPRITE_WIDTH:
				img.set_pixel(tx, py, shirt.darkened(0.35))
			if tx + tw - 1 >= 0 and tx + tw - 1 < SPRITE_WIDTH:
				img.set_pixel(tx + tw - 1, py, shirt.darkened(0.35))

	# Wrinkle/fold lines (PZ realism)
	var wrinkle_rows = [ty + 8, ty + 14, ty + 20]
	for wy in wrinkle_rows:
		if wy >= 0 and wy < SPRITE_HEIGHT and wy < ty + th:
			for px in range(tx + 2, tx + tw - 2):
				if px >= 0 and px < SPRITE_WIDTH:
					var current = img.get_pixel(px, wy)
					img.set_pixel(px, wy, current.darkened(0.18))

	# Depth shading on edges
	for py in range(ty, ty + th):
		if py >= 0 and py < SPRITE_HEIGHT:
			if tx >= 0 and tx < SPRITE_WIDTH:
				var c = img.get_pixel(tx, py)
				img.set_pixel(tx, py, c.lightened(0.12))
			if tx + tw - 1 >= 0 and tx + tw - 1 < SPRITE_WIDTH:
				var c = img.get_pixel(tx + tw - 1, py)
				img.set_pixel(tx + tw - 1, py, c.darkened(0.12))

func draw_belt(img: Image, data: Dictionary):
	# Draw belt with buckle
	var bx = int(data.x)
	var by = int(data.y)
	var bw = int(data.width)
	var bh = int(data.height)

	draw_solid_rect(img, bx, by, bw, bh, COLOR_BELT)

	# Belt buckle (centered)
	var buckle_x = bx + bw / 2 - 1
	var buckle_y = by
	if buckle_x >= 0 and buckle_x + 2 < SPRITE_WIDTH and buckle_y >= 0 and buckle_y < SPRITE_HEIGHT:
		img.set_pixel(buckle_x, buckle_y, Color(0.5, 0.5, 0.45))
		img.set_pixel(buckle_x + 1, buckle_y, Color(0.5, 0.5, 0.45))
		img.set_pixel(buckle_x + 2, buckle_y, Color(0.5, 0.5, 0.45))

func draw_arm(img: Image, data: Dictionary):
	# Draw arm: sleeve + forearm with PZ detail
	var ax = int(data.x)
	var ay = int(data.y)
	var aw = int(data.width)
	var ah = int(data.height)
	var sleeve_h = int(data.sleeve_height)

	var shirt = COLOR_SHIRT
	var skin = COLOR_SKIN

	# Upper arm (sleeve)
	draw_solid_rect(img, ax, ay, aw, sleeve_h, shirt)

	# Sleeve cuff (darker band)
	if ay + sleeve_h - 1 >= 0 and ay + sleeve_h - 1 < SPRITE_HEIGHT:
		for px in range(ax, ax + aw):
			if px >= 0 and px < SPRITE_WIDTH:
				img.set_pixel(px, ay + sleeve_h - 1, shirt.darkened(0.3))

	# Forearm (skin)
	draw_solid_rect(img, ax, ay + sleeve_h, aw, ah - sleeve_h, skin)

	# Edge highlights for depth
	for py in range(ay, ay + ah):
		if py >= 0 and py < SPRITE_HEIGHT:
			if ax >= 0 and ax < SPRITE_WIDTH:
				var c = img.get_pixel(ax, py)
				img.set_pixel(ax, py, c.lightened(0.15))
			if ax + aw - 1 >= 0 and ax + aw - 1 < SPRITE_WIDTH:
				var c = img.get_pixel(ax + aw - 1, py)
				img.set_pixel(ax + aw - 1, py, c.darkened(0.15))

func draw_hand(img: Image, data: Dictionary):
	# Draw hand with skin tone
	var hx = int(data.x)
	var hy = int(data.y)
	var hw = int(data.width)
	var hh = int(data.height)

	draw_solid_rect(img, hx, hy, hw, hh, COLOR_SKIN)

	# Slight shading for fingers
	if hy + hh - 1 >= 0 and hy + hh - 1 < SPRITE_HEIGHT:
		for px in range(hx, hx + hw):
			if px >= 0 and px < SPRITE_WIDTH:
				img.set_pixel(px, hy + hh - 1, COLOR_SKIN.darkened(0.2))

func draw_leg(img: Image, data: Dictionary):
	# Draw leg with knee crease and PZ detail
	var lx = int(data.x)
	var ly = int(data.y)
	var lw = int(data.width)
	var lh = int(data.height)

	var pants = COLOR_PANTS

	# Fill base pants
	draw_solid_rect(img, lx, ly, lw, lh, pants)

	# Knee crease (horizontal line)
	var knee_y = ly + lh / 2
	if knee_y >= 0 and knee_y < SPRITE_HEIGHT:
		for px in range(lx, lx + lw):
			if px >= 0 and px < SPRITE_WIDTH:
				img.set_pixel(px, knee_y, pants.darkened(0.35))

	# Thigh/calf shading for depth
	for py in range(ly, ly + lh / 2):
		if py >= 0 and py < SPRITE_HEIGHT:
			for px in range(lx, lx + lw):
				if px >= 0 and px < SPRITE_WIDTH:
					var c = img.get_pixel(px, py)
					img.set_pixel(px, py, c.lightened(0.08))

	for py in range(ly + lh / 2, ly + lh):
		if py >= 0 and py < SPRITE_HEIGHT:
			for px in range(lx, lx + lw):
				if px >= 0 and px < SPRITE_WIDTH:
					var c = img.get_pixel(px, py)
					img.set_pixel(px, py, c.darkened(0.08))

	# Ankle taper (narrow at bottom)
	for py in range(ly + lh - 4, ly + lh):
		if py >= 0 and py < SPRITE_HEIGHT:
			if lx >= 0 and lx < SPRITE_WIDTH:
				img.set_pixel(lx, py, Color(0, 0, 0, 0))
			if lx + lw - 1 >= 0 and lx + lw - 1 < SPRITE_WIDTH:
				img.set_pixel(lx + lw - 1, py, Color(0, 0, 0, 0))

func draw_boot(img: Image, data: Dictionary):
	# Draw boot with sole (PZ quality)
	var bx = int(data.x)
	var by = int(data.y)
	var bw = int(data.width)
	var bh = int(data.height)

	var boot = COLOR_BOOTS
	var sole = boot.lightened(0.15)

	# Boot body
	draw_solid_rect(img, bx, by, bw, bh - 2, boot)

	# Sole (bottom 2px)
	draw_solid_rect(img, bx, by + bh - 2, bw, 2, sole)

	# Lace line (vertical detail on front)
	var lace_x = bx + bw / 2
	for py in range(by, by + bh - 2):
		if py >= 0 and py < SPRITE_HEIGHT and lace_x >= 0 and lace_x < SPRITE_WIDTH:
			img.set_pixel(lace_x, py, boot.darkened(0.25))

func draw_solid_rect(img: Image, x: int, y: int, width: int, height: int, color: Color):
	# Draw solid rectangle with bounds checking
	for py in range(y, y + height):
		for px in range(x, x + width):
			if px >= 0 and px < SPRITE_WIDTH and py >= 0 and py < SPRITE_HEIGHT:
				img.set_pixel(px, py, color)

func draw_shadow(img: Image, parts: Dictionary):
	# Draw elliptical shadow beneath character (PZ size: 24x8)
	var shadow_center_x = SPRITE_WIDTH / 2
	var shadow_center_y = SPRITE_HEIGHT - 6
	var shadow_width = 12.0
	var shadow_height = 4.0

	for x in range(int(shadow_center_x - shadow_width), int(shadow_center_x + shadow_width)):
		for y in range(int(shadow_center_y - shadow_height), int(shadow_center_y + shadow_height)):
			if x >= 0 and x < SPRITE_WIDTH and y >= 0 and y < SPRITE_HEIGHT:
				var dx = float(x - shadow_center_x) / shadow_width
				var dy = float(y - shadow_center_y) / shadow_height
				var dist = sqrt(dx * dx + dy * dy)

				if dist <= 1.0:
					var alpha = 0.35 * (1.0 - dist)
					var shadow_color = Color(0.0, 0.0, 0.0, alpha)

					var existing = img.get_pixel(x, y)
					if existing.a < 0.01:
						img.set_pixel(x, y, shadow_color)

func add_outline(img: Image):
	# Add 1px dark outline around character silhouette (PZ crispness)
	var outlined = Image.create(SPRITE_WIDTH, SPRITE_HEIGHT, false, Image.FORMAT_RGBA8)
	outlined.fill(Color(0, 0, 0, 0))

	var outline_color = COLOR_OUTLINE

	# First pass: detect edges and draw outline
	for x in range(SPRITE_WIDTH):
		for y in range(SPRITE_HEIGHT):
			var pixel = img.get_pixel(x, y)
			if pixel.a > 0.5:
				# Check 8 neighbors for transparent pixels
				for dx in [-1, 0, 1]:
					for dy in [-1, 0, 1]:
						if dx == 0 and dy == 0:
							continue
						var nx = x + dx
						var ny = y + dy
						if nx >= 0 and nx < SPRITE_WIDTH and ny >= 0 and ny < SPRITE_HEIGHT:
							var neighbor = img.get_pixel(nx, ny)
							if neighbor.a < 0.1:
								outlined.set_pixel(nx, ny, outline_color)

	# Second pass: overlay original sprite
	for x in range(SPRITE_WIDTH):
		for y in range(SPRITE_HEIGHT):
			var original = img.get_pixel(x, y)
			if original.a > 0.01:
				outlined.set_pixel(x, y, original)

	# Copy back
	for x in range(SPRITE_WIDTH):
		for y in range(SPRITE_HEIGHT):
			img.set_pixel(x, y, outlined.get_pixel(x, y))

func create_shadow_texture():
	# Create reusable shadow texture
	var shadow_size = 32
	var img = Image.create(shadow_size, shadow_size, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))

	var center = shadow_size / 2
	for x in range(shadow_size):
		for y in range(shadow_size):
			var dx = x - center
			var dy = y - center
			var dist = sqrt(dx * dx + dy * dy) / center

			if dist <= 1.0:
				var alpha = 0.35 * (1.0 - dist)
				img.set_pixel(x, y, Color(0, 0, 0, alpha))

	shadow_texture = ImageTexture.create_from_image(img)
