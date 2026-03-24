class_name TileManager
extends Node

# Texture atlases
var tile_textures: Dictionary = {}  # {tile_name: ImageTexture}
var object_textures: Dictionary = {}  # {object_name_variant: ImageTexture}

# Tile constants
const TILE_WIDTH = 64
const TILE_HEIGHT = 32
const OBJECT_TREE_HEIGHT = 96
const OBJECT_ROCK_HEIGHT = 24
const OBJECT_BUSH_HEIGHT = 22

# References
var world_generator: WorldGenerator
var world_node: Node2D
var object_container: Node2D

# Viewport culling system
var camera_target: Node2D = null  # Set via set_camera_target()
var last_camera_gx: int = -9999
var last_camera_gy: int = -9999
const VIEW_RADIUS: int = 15  # Tiles visible in each direction (~30x30 grid)

# Tile sprite pool
var tile_sprite_pool: Array[Sprite2D] = []
var active_tile_sprites: Dictionary = {}  # {"gx,gy": Sprite2D}
const TILE_POOL_SIZE: int = 1024  # ~32x32 visible area

# Object sprite pool and spatial index
var object_sprite_pool: Array[Sprite2D] = []
var active_object_sprites: Dictionary = {}  # {"gx,gy": Sprite2D}
var object_spatial_index: Dictionary = {}  # {"gx,gy": {type, variant, rotation}}
const OBJECT_POOL_SIZE: int = 512
const OBJECT_VIEW_RADIUS: int = 30

func _ready():
	print("TileManager: Generating procedural textures...")
	var start = Time.get_ticks_msec()
	generate_all_textures()
	var elapsed = Time.get_ticks_msec() - start
	print("TileManager: Textures generated in ", elapsed, "ms")

func generate_all_textures():
	# Generate tile textures (isometric diamonds)
	for i in range(3):
		tile_textures["grass_" + str(i)] = create_grass_tile(i)
		tile_textures["dirt_" + str(i)] = create_dirt_tile(i)
		tile_textures["water_" + str(i)] = create_water_tile(i)

	for i in range(2):
		tile_textures["stone_" + str(i)] = create_stone_tile(i)
		tile_textures["sand_" + str(i)] = create_sand_tile(i)
		tile_textures["road_" + str(i)] = create_road_tile(i)

	tile_textures["floor"] = create_floor_tile()

	# Generate object textures
	for i in range(4):
		object_textures["tree_" + str(i)] = create_tree_sprite(i)

	for i in range(2):
		object_textures["rock_" + str(i)] = create_rock_sprite(i)
		object_textures["bush_" + str(i)] = create_bush_sprite(i)

	# Furniture
	object_textures["bed"] = create_furniture_sprite("bed")
	object_textures["table"] = create_furniture_sprite("table")
	object_textures["chair"] = create_furniture_sprite("chair")
	object_textures["sink"] = create_furniture_sprite("sink")
	object_textures["oven"] = create_furniture_sprite("oven")
	object_textures["fridge"] = create_furniture_sprite("fridge")
	object_textures["couch"] = create_furniture_sprite("couch")
	object_textures["dresser"] = create_furniture_sprite("dresser")
	object_textures["door"] = create_furniture_sprite("door")

	# Vehicles
	object_textures["sedan"] = create_vehicle_sprite("sedan")
	object_textures["suv"] = create_vehicle_sprite("suv")
	object_textures["truck"] = create_vehicle_sprite("truck")
	object_textures["van"] = create_vehicle_sprite("van")
	object_textures["sports_car"] = create_vehicle_sprite("sports_car")

func create_grass_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.3 + variant * 0.05, 0.6 + variant * 0.05, 0.25, 1.0)

	# Draw isometric diamond
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			# Isometric diamond shape check
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				# Add noise variation
				var noise_val = randf_range(-0.1, 0.1)
				var color = base_color.lerp(base_color.darkened(0.2), noise_val + 0.5)

				# NW lighting (top-left lighter, bottom-right darker)
				var light_factor = 1.0 - (float(x) / TILE_WIDTH * 0.3 + float(y) / TILE_HEIGHT * 0.3)
				color = color.lerp(color.lightened(0.3), light_factor * 0.5)

				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Add grass blade details
	for i in range(5 + variant * 2):
		var gx = randi() % TILE_WIDTH
		var gy = randi() % TILE_HEIGHT
		var blade_color = base_color.darkened(0.3)
		if gx < TILE_WIDTH and gy < TILE_HEIGHT:
			img.set_pixel(gx, gy, blade_color)

	return ImageTexture.create_from_image(img)

func create_dirt_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.4 + variant * 0.05, 0.3 + variant * 0.03, 0.2, 1.0)

	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var noise_val = randf_range(-0.15, 0.15)
				var color = base_color.lerp(base_color.darkened(0.3), noise_val + 0.5)
				var light_factor = 1.0 - (float(x) / TILE_WIDTH * 0.2 + float(y) / TILE_HEIGHT * 0.3)
				color = color.lerp(color.lightened(0.2), light_factor * 0.4)
				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	return ImageTexture.create_from_image(img)

func create_stone_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.5 + variant * 0.1, 0.5 + variant * 0.1, 0.55 + variant * 0.05, 1.0)

	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var noise_val = randf_range(-0.2, 0.2)
				var color = base_color.lerp(base_color.darkened(0.4), noise_val + 0.5)
				var light_factor = 1.0 - (float(x) / TILE_WIDTH * 0.25 + float(y) / TILE_HEIGHT * 0.35)
				color = color.lerp(color.lightened(0.25), light_factor * 0.5)
				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	return ImageTexture.create_from_image(img)

func create_water_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.2, 0.4 + variant * 0.05, 0.6 + variant * 0.05, 0.9)

	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color
				# Subtle wave pattern
				var wave = sin(float(x) * 0.5 + variant * 2.0) * 0.1
				color = color.lerp(color.lightened(0.2), wave + 0.5)
				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	return ImageTexture.create_from_image(img)

func create_sand_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.8 + variant * 0.05, 0.75 + variant * 0.04, 0.5, 1.0)

	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var noise_val = randf_range(-0.08, 0.08)
				var color = base_color.lerp(base_color.darkened(0.15), noise_val + 0.5)
				var light_factor = 1.0 - (float(x) / TILE_WIDTH * 0.15 + float(y) / TILE_HEIGHT * 0.2)
				color = color.lerp(color.lightened(0.15), light_factor * 0.4)
				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	return ImageTexture.create_from_image(img)

func create_road_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.3 + variant * 0.05, 0.3 + variant * 0.05, 0.35 + variant * 0.05, 1.0)

	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color
				# Road texture (subtle cracks)
				if randf() < 0.02:
					color = color.darkened(0.4)
				var light_factor = 1.0 - (float(x) / TILE_WIDTH * 0.1 + float(y) / TILE_HEIGHT * 0.15)
				color = color.lerp(color.lightened(0.1), light_factor * 0.3)
				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	return ImageTexture.create_from_image(img)

func create_floor_tile() -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.6, 0.55, 0.45, 1.0)

	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color
				# Wood grain simulation
				var grain = sin(float(x) * 0.3) * 0.05
				color = color.lerp(color.darkened(0.1), grain + 0.5)
				var light_factor = 1.0 - (float(x) / TILE_WIDTH * 0.2 + float(y) / TILE_HEIGHT * 0.25)
				color = color.lerp(color.lightened(0.2), light_factor * 0.4)
				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	return ImageTexture.create_from_image(img)

func create_tree_sprite(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, OBJECT_TREE_HEIGHT, false, Image.FORMAT_RGBA8)
	var canopy_color = Color(0.2 + variant * 0.05, 0.5 + variant * 0.03, 0.25, 1.0)
	var trunk_color = Color(0.35, 0.25, 0.15, 1.0)

	# Trunk (bottom third, center)
	var trunk_width = 6 + variant
	var trunk_height = 30
	for y in range(OBJECT_TREE_HEIGHT - trunk_height, OBJECT_TREE_HEIGHT):
		for x in range(TILE_WIDTH / 2 - trunk_width / 2, TILE_WIDTH / 2 + trunk_width / 2):
			if x >= 0 and x < TILE_WIDTH:
				var color = trunk_color.lerp(trunk_color.darkened(0.3), randf_range(0, 0.3))
				img.set_pixel(x, y, color)

	# Canopy (top, circular-ish blob)
	var canopy_radius = 18 + variant * 2
	var canopy_center_x = TILE_WIDTH / 2
	var canopy_center_y = OBJECT_TREE_HEIGHT - trunk_height - canopy_radius

	for y in range(max(0, canopy_center_y - canopy_radius), min(OBJECT_TREE_HEIGHT, canopy_center_y + canopy_radius)):
		for x in range(max(0, canopy_center_x - canopy_radius), min(TILE_WIDTH, canopy_center_x + canopy_radius)):
			var dx = x - canopy_center_x
			var dy = y - canopy_center_y
			var dist = sqrt(dx * dx + dy * dy)
			if dist < canopy_radius:
				# Noise for organic shape
				if randf() < 0.7:
					var color = canopy_color.lerp(canopy_color.darkened(0.2), randf_range(0, 0.4))
					# NW lighting
					var light = 1.0 - (float(x) / TILE_WIDTH * 0.3 + float(y) / OBJECT_TREE_HEIGHT * 0.3)
					color = color.lerp(color.lightened(0.3), light * 0.5)
					img.set_pixel(x, y, color)

	return ImageTexture.create_from_image(img)

func create_rock_sprite(variant: int) -> ImageTexture:
	var img = Image.create(32, OBJECT_ROCK_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.5 + variant * 0.1, 0.5 + variant * 0.1, 0.55, 1.0)

	# Irregular rock blob
	var center_x = 16
	var center_y = 12
	var radius = 10 + variant * 2

	for y in range(OBJECT_ROCK_HEIGHT):
		for x in range(32):
			var dx = x - center_x
			var dy = y - center_y
			var dist = sqrt(dx * dx + dy * dy)
			if dist < radius + randf_range(-2, 2):
				var color = base_color.lerp(base_color.darkened(0.3), randf_range(0, 0.5))
				# NW lighting
				var light = 1.0 - (float(x) / 32.0 * 0.4 + float(y) / OBJECT_ROCK_HEIGHT * 0.4)
				color = color.lerp(color.lightened(0.4), light * 0.6)
				img.set_pixel(x, y, color)

	return ImageTexture.create_from_image(img)

func create_bush_sprite(variant: int) -> ImageTexture:
	var img = Image.create(28, OBJECT_BUSH_HEIGHT, false, Image.FORMAT_RGBA8)
	var base_color = Color(0.25 + variant * 0.05, 0.55 + variant * 0.05, 0.3, 1.0)

	# Bushy blob
	var center_x = 14
	var center_y = 11
	var radius = 8 + variant

	for y in range(OBJECT_BUSH_HEIGHT):
		for x in range(28):
			var dx = x - center_x
			var dy = y - center_y
			var dist = sqrt(dx * dx + dy * dy)
			if dist < radius + randf_range(-1, 1):
				if randf() < 0.75:
					var color = base_color.lerp(base_color.darkened(0.25), randf_range(0, 0.4))
					var light = 1.0 - (float(x) / 28.0 * 0.3 + float(y) / OBJECT_BUSH_HEIGHT * 0.3)
					color = color.lerp(color.lightened(0.25), light * 0.5)
					img.set_pixel(x, y, color)

	return ImageTexture.create_from_image(img)

func create_furniture_sprite(ftype: String) -> ImageTexture:
	var img = Image.create(32, 32, false, Image.FORMAT_RGBA8)
	var color = Color(0.5, 0.4, 0.3, 1.0)

	# Simple rectangular furniture (placeholder - can be enhanced)
	match ftype:
		"bed":
			color = Color(0.6, 0.5, 0.4, 1.0)
		"table":
			color = Color(0.55, 0.45, 0.35, 1.0)
		"chair":
			color = Color(0.5, 0.4, 0.3, 1.0)
		"sink", "oven", "fridge":
			color = Color(0.8, 0.8, 0.85, 1.0)
		"couch":
			color = Color(0.4, 0.35, 0.3, 1.0)
		"dresser":
			color = Color(0.55, 0.45, 0.35, 1.0)
		"door":
			color = Color(0.45, 0.35, 0.25, 1.0)

	# Fill rectangle
	for y in range(8, 24):
		for x in range(8, 24):
			var light = 1.0 - (float(x) / 32.0 * 0.2 + float(y) / 32.0 * 0.3)
			var pixel_color = color.lerp(color.lightened(0.2), light * 0.5)
			img.set_pixel(x, y, pixel_color)

	return ImageTexture.create_from_image(img)

func create_vehicle_sprite(vtype: String) -> ImageTexture:
	var img = Image.create(48, 32, false, Image.FORMAT_RGBA8)
	var color = Color(0.3, 0.3, 0.35, 1.0)

	match vtype:
		"sedan":
			color = Color(0.7, 0.2, 0.2, 1.0)
		"suv":
			color = Color(0.2, 0.3, 0.6, 1.0)
		"truck":
			color = Color(0.4, 0.4, 0.35, 1.0)
		"van":
			color = Color(0.6, 0.6, 0.65, 1.0)
		"sports_car":
			color = Color(0.9, 0.8, 0.1, 1.0)

	# Simple car shape (top-down isometric)
	for y in range(8, 24):
		for x in range(12, 36):
			var light = 1.0 - (float(x) / 48.0 * 0.25 + float(y) / 32.0 * 0.3)
			var pixel_color = color.lerp(color.lightened(0.3), light * 0.5)
			img.set_pixel(x, y, pixel_color)

	return ImageTexture.create_from_image(img)

func build_world(world_gen: WorldGenerator, parent: Node2D):
	world_generator = world_gen
	world_node = parent

	print("TileManager: Building world with viewport culling...")

	# Create object container (Y-sort for depth)
	object_container = Node2D.new()
	object_container.name = "Objects"
	object_container.y_sort_enabled = true
	world_node.add_child(object_container)

	# Initialize sprite pools
	_initialize_tile_pool()
	_initialize_object_pool()

	# Build spatial index for objects
	_build_object_spatial_index()

	# Initial render (will be updated in _process when camera_target is set)
	print("TileManager: World built (sprite pools created, awaiting camera target)")

func _initialize_tile_pool():
	"""Create reusable pool of tile sprites"""
	for i in range(TILE_POOL_SIZE):
		var sprite = Sprite2D.new()
		sprite.z_index = -1
		sprite.visible = false
		world_node.add_child(sprite)
		tile_sprite_pool.append(sprite)
	print("TileManager: Created tile sprite pool (", TILE_POOL_SIZE, " sprites)")

func _initialize_object_pool():
	"""Create reusable pool of object sprites"""
	for i in range(OBJECT_POOL_SIZE):
		var sprite = Sprite2D.new()
		sprite.z_index = 0
		sprite.visible = false
		object_container.add_child(sprite)
		object_sprite_pool.append(sprite)
	print("TileManager: Created object sprite pool (", OBJECT_POOL_SIZE, " sprites)")

func _build_object_spatial_index():
	"""Index all objects by grid position for fast lookup"""
	# Index regular objects
	for obj in world_generator.objects:
		var key = str(obj.gx) + "," + str(obj.gy)
		object_spatial_index[key] = {
			"type": obj.type,
			"variant": obj.variant if obj.has("variant") else 0,
			"is_vehicle": false
		}

	# Index vehicles
	for veh in world_generator.vehicles:
		var key = str(veh.gx) + "," + str(veh.gy)
		object_spatial_index[key] = {
			"type": veh.type,
			"variant": 0,
			"rotation": veh.rotation,
			"is_vehicle": true
		}

	print("TileManager: Built spatial index (", object_spatial_index.size(), " objects)")

func set_camera_target(node: Node2D):
	"""Set the player/camera node to track for viewport culling"""
	camera_target = node
	print("TileManager: Camera target set, viewport culling enabled")

func _process(_delta):
	if camera_target == null or world_generator == null:
		return

	# Convert camera position to grid coordinates
	var screen_pos = camera_target.global_position
	var camera_gx = _screen_to_grid_x(screen_pos)
	var camera_gy = _screen_to_grid_y(screen_pos)

	# Only update when camera moves to a new grid cell
	if camera_gx == last_camera_gx and camera_gy == last_camera_gy:
		return

	last_camera_gx = camera_gx
	last_camera_gy = camera_gy

	# Update visible tiles and objects
	_update_visible_tiles(camera_gx, camera_gy)
	_update_visible_objects(camera_gx, camera_gy)

func _screen_to_grid_x(screen_pos: Vector2) -> int:
	"""Convert screen position to grid X (approximate inverse of grid_to_screen)"""
	var sx = screen_pos.x
	var sy = screen_pos.y
	# Inverse isometric transformation
	var gx = (sx / (TILE_WIDTH / 2) + sy / (TILE_HEIGHT / 2)) / 2
	return int(gx)

func _screen_to_grid_y(screen_pos: Vector2) -> int:
	"""Convert screen position to grid Y (approximate inverse of grid_to_screen)"""
	var sx = screen_pos.x
	var sy = screen_pos.y
	# Inverse isometric transformation
	var gy = (sy / (TILE_HEIGHT / 2) - sx / (TILE_WIDTH / 2)) / 2
	return int(gy)

func _update_visible_tiles(center_gx: int, center_gy: int):
	"""Update tile sprites to show only visible tiles around camera"""
	var new_active_tiles: Dictionary = {}

	# Determine visible tile range
	var min_gx = max(0, center_gx - VIEW_RADIUS)
	var max_gx = min(255, center_gx + VIEW_RADIUS)
	var min_gy = max(0, center_gy - VIEW_RADIUS)
	var max_gy = min(255, center_gy + VIEW_RADIUS)

	# Collect sprites that went out of view for recycling
	var free_sprites: Array[Sprite2D] = []
	for key in active_tile_sprites.keys():
		var parts = key.split(",")
		var gx = int(parts[0])
		var gy = int(parts[1])
		if gx < min_gx or gx > max_gx or gy < min_gy or gy > max_gy:
			active_tile_sprites[key].visible = false
			free_sprites.append(active_tile_sprites[key])
		else:
			new_active_tiles[key] = active_tile_sprites[key]

	# Also collect unused pool sprites
	for spr in tile_sprite_pool:
		if not spr.visible:
			free_sprites.append(spr)

	var free_idx = 0

	# Render visible tiles
	for gy in range(min_gy, max_gy + 1):
		for gx in range(min_gx, max_gx + 1):
			var key = str(gx) + "," + str(gy)

			# Skip if already active
			if new_active_tiles.has(key):
				continue

			if free_idx >= free_sprites.size():
				break

			# Get tile data
			var tile_id = world_generator.get_tile(gx, gy)
			var tile_name = get_tile_name(tile_id)

			if tile_textures.has(tile_name):
				var sprite = free_sprites[free_idx]
				free_idx += 1
				sprite.texture = tile_textures[tile_name]
				sprite.position = grid_to_screen(gx, gy, world_generator.get_elevation(gx, gy))
				sprite.visible = true
				new_active_tiles[key] = sprite

	active_tile_sprites = new_active_tiles

func _update_visible_objects(center_gx: int, center_gy: int):
	"""Update object sprites to show only visible objects around camera"""
	var new_active_objects: Dictionary = {}

	# Determine visible object range
	var min_gx = max(0, center_gx - OBJECT_VIEW_RADIUS)
	var max_gx = min(255, center_gx + OBJECT_VIEW_RADIUS)
	var min_gy = max(0, center_gy - OBJECT_VIEW_RADIUS)
	var max_gy = min(255, center_gy + OBJECT_VIEW_RADIUS)

	# Collect sprites that went out of view for recycling
	var free_sprites: Array[Sprite2D] = []
	for key in active_object_sprites.keys():
		var parts = key.split(",")
		var gx = int(parts[0])
		var gy = int(parts[1])
		if gx < min_gx or gx > max_gx or gy < min_gy or gy > max_gy:
			active_object_sprites[key].visible = false
			free_sprites.append(active_object_sprites[key])
		else:
			new_active_objects[key] = active_object_sprites[key]

	# Also collect unused pool sprites
	for spr in object_sprite_pool:
		if not spr.visible:
			free_sprites.append(spr)

	var free_idx = 0

	# Render visible objects
	for gy in range(min_gy, max_gy + 1):
		for gx in range(min_gx, max_gx + 1):
			var key = str(gx) + "," + str(gy)

			# Check if object exists at this position
			if not object_spatial_index.has(key):
				continue

			# Skip if already active
			if new_active_objects.has(key):
				continue

			if free_idx >= free_sprites.size():
				break

			var obj_data = object_spatial_index[key]
			var obj_key = obj_data.type
			if obj_data.has("variant") and obj_data.variant > 0:
				obj_key += "_" + str(obj_data.variant)

			if object_textures.has(obj_key):
				var sprite = free_sprites[free_idx]
				free_idx += 1
				sprite.texture = object_textures[obj_key]
				sprite.position = grid_to_screen(gx, gy, world_generator.get_elevation(gx, gy))

				# Apply rotation for vehicles
				if obj_data.is_vehicle and obj_data.has("rotation"):
					sprite.rotation = obj_data.rotation * PI / 2.0
				else:
					sprite.rotation = 0.0

				sprite.visible = true
				new_active_objects[key] = sprite

	active_object_sprites = new_active_objects

func get_tile_name(tile_id: int) -> String:
	match tile_id:
		0, 1, 2:
			return "water_" + str(tile_id)
		3, 4, 5:
			return "grass_" + str(tile_id - 3)
		6, 7, 8:
			return "dirt_" + str(tile_id - 6)
		10, 11:
			return "stone_" + str(tile_id - 10)
		12, 13:
			return "sand_" + str(tile_id - 12)
		20, 21:
			return "road_" + str(tile_id - 20)
		30:
			return "floor"
		_:
			return "grass_0"

func grid_to_screen(gx: int, gy: int, elevation: float) -> Vector2:
	var screen_x = (gx - gy) * (TILE_WIDTH / 2)
	var screen_y = (gx + gy) * (TILE_HEIGHT / 2)
	screen_y -= elevation * 8.0  # Elevation offset
	return Vector2(screen_x, screen_y)
