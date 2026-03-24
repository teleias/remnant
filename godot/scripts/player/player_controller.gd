extends CharacterBody2D

# Movement constants
const WALK_SPEED = 80.0
const SPRINT_SPEED = 140.0
const SNEAK_SPEED = 40.0
const ACCELERATION = 800.0
const FRICTION = 1200.0

# Grid/screen conversion
const TILE_WIDTH = 64
const TILE_HEIGHT = 32
const HALF_TILE_WIDTH = 32
const HALF_TILE_HEIGHT = 16
const ELEVATION_STEP = 8

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

func _ready():
	# Add to player group so HUD and other systems can find us
	add_to_group("player")

	# Create procedural player sprite
	if sprite:
		create_player_texture()
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
	update_animation()

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
	# Isometric grid to screen coordinates
	var screen_x = (grid_x - grid_y) * HALF_TILE_WIDTH
	var screen_y = (grid_x + grid_y) * HALF_TILE_HEIGHT

	# Apply elevation offset
	var elev = get_elevation(int(grid_x), int(grid_y))
	screen_y -= elev * ELEVATION_STEP

	# Smooth interpolation
	position = position.lerp(Vector2(screen_x, screen_y), 0.3)

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

func update_animation():
	# Update sprite based on direction and movement state
	# Placeholder: In production, drive AnimatedSprite2D frames
	if not sprite:
		return

	# Flip sprite based on direction
	if current_direction in ["E", "SE", "NE"]:
		sprite.flip_h = false
	elif current_direction in ["W", "SW", "NW"]:
		sprite.flip_h = true

	# Animation state (requires AnimatedSprite2D or animation frames)
	# This is a placeholder - full implementation would switch between idle/walk/sprint animations
	var anim_name = "idle_" + current_direction.to_lower()
	if is_moving:
		if is_sprinting:
			anim_name = "sprint_" + current_direction.to_lower()
		else:
			anim_name = "walk_" + current_direction.to_lower()

	# If using AnimationPlayer
	if animation_player and animation_player.has_animation(anim_name):
		if animation_player.current_animation != anim_name:
			animation_player.play(anim_name)

func set_walkability_grid(grid, size: int):
	walkability_grid = grid
	world_size = size

func set_elevation_grid(grid, size: int):
	elevation_grid = grid
	world_size = size

func create_player_texture():
	# Create a simple humanoid sprite procedurally (24x40 pixels)
	var width = 24
	var height = 40
	var img = Image.create(width, height, false, Image.FORMAT_RGBA8)

	# Colors
	var skin_color = Color(0.85, 0.65, 0.5, 1)  # Tan skin
	var clothing_color = Color(0.2, 0.4, 0.2, 1)  # Dark green clothing
	var hair_color = Color(0.3, 0.2, 0.1, 1)  # Brown hair

	# Draw head (circle at top, centered)
	var head_radius = 4
	var head_center_x = width / 2
	var head_center_y = 6
	for x in range(width):
		for y in range(height):
			var dx = x - head_center_x
			var dy = y - head_center_y
			var dist = sqrt(dx * dx + dy * dy)

			# Head
			if dist <= head_radius:
				img.set_pixel(x, y, skin_color)

			# Hair (top of head)
			if dist <= head_radius and y < head_center_y:
				img.set_pixel(x, y, hair_color)

			# Body (rectangle below head)
			if x >= 8 and x < 16 and y >= 12 and y < 28:
				img.set_pixel(x, y, clothing_color)

			# Left leg
			if x >= 8 and x < 11 and y >= 28 and y < 38:
				img.set_pixel(x, y, clothing_color)

			# Right leg
			if x >= 13 and x < 16 and y >= 28 and y < 38:
				img.set_pixel(x, y, clothing_color)

			# Left arm
			if x >= 5 and x < 8 and y >= 14 and y < 26:
				img.set_pixel(x, y, skin_color)

			# Right arm
			if x >= 16 and x < 19 and y >= 14 and y < 26:
				img.set_pixel(x, y, skin_color)

	# Create texture from image
	var texture = ImageTexture.create_from_image(img)
	sprite.texture = texture
	sprite.centered = true

func teleport_to(gx: float, gy: float):
	grid_x = gx
	grid_y = gy
	var gs = get_node("/root/GameState") if has_node("/root/GameState") else null
	if gs:
		gs.player_grid_x = gx
		gs.player_grid_y = gy
	update_screen_position()
