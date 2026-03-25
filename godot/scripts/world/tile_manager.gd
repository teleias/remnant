class_name TileManager
extends Node

# Texture atlases
var tile_textures: Dictionary = {}  # {tile_name: ImageTexture}
var object_textures: Dictionary = {}  # {object_name_variant: ImageTexture}
var shadow_textures: Dictionary = {}  # {object_name_variant: ImageTexture}

# Project Zomboid scale constants
const TILE_WIDTH = 128
const TILE_HEIGHT = 64
const OBJECT_TREE_WIDTH = 128
const OBJECT_TREE_HEIGHT = 220
const OBJECT_ROCK_WIDTH = 64
const OBJECT_ROCK_HEIGHT = 48
const OBJECT_BUSH_WIDTH = 56
const OBJECT_BUSH_HEIGHT = 44
const OBJECT_FURNITURE_SIZE = 64
const OBJECT_VEHICLE_WIDTH = 128
const OBJECT_VEHICLE_HEIGHT = 80
const GRASS_TUFT_WIDTH = 20
const GRASS_TUFT_HEIGHT = 24

# References
var world_generator: WorldGenerator
var world_node: Node2D
var object_container: Node2D

# Viewport culling system
var camera_target: Node2D = null  # Set via set_camera_target()
var last_camera_gx: int = -9999
var last_camera_gy: int = -9999
const VIEW_RADIUS: int = 12  # Tiles visible in each direction (~24x24 grid with larger tiles)

# Tile sprite pool
var tile_sprite_pool: Array[Sprite2D] = []
var active_tile_sprites: Dictionary = {}  # {"gx,gy": Sprite2D}
const TILE_POOL_SIZE: int = 784  # ~28x28 visible area

# Object sprite pool and spatial index
var object_sprite_pool: Array[Sprite2D] = []
var active_object_sprites: Dictionary = {}  # {"gx,gy": Sprite2D}
var object_spatial_index: Dictionary = {}  # {"gx,gy": {type, variant, rotation}}
const OBJECT_POOL_SIZE: int = 512
const OBJECT_VIEW_RADIUS: int = 30

# Shadow sprite pool
var shadow_sprite_pool: Array[Sprite2D] = []
var active_shadow_sprites: Dictionary = {}  # {"gx,gy": Sprite2D}
const SHADOW_POOL_SIZE: int = 512

# Grass overlay sprite pool
var grass_sprite_pool: Array[Sprite2D] = []
var active_grass_sprites: Dictionary = {}  # {"gx,gy,idx": Sprite2D}
var grass_tuft_textures: Array[ImageTexture] = []
const GRASS_POOL_SIZE: int = 256

func _ready():
	print("TileManager: Generating procedural textures...")
	var start = Time.get_ticks_msec()
	generate_all_textures()
	var elapsed = Time.get_ticks_msec() - start
	print("TileManager: Textures generated in ", elapsed, "ms")

func generate_all_textures():
	# Generate tile textures (isometric diamonds) - 6 grass variants
	for i in range(6):
		tile_textures["grass_" + str(i)] = create_grass_tile(i)

	# 4 dirt variants
	for i in range(4):
		tile_textures["dirt_" + str(i)] = create_dirt_tile(i)

	# 3 water variants
	for i in range(3):
		tile_textures["water_" + str(i)] = create_water_tile(i)

	# 3 stone variants
	for i in range(3):
		tile_textures["stone_" + str(i)] = create_stone_tile(i)

	# 2 sand variants
	for i in range(2):
		tile_textures["sand_" + str(i)] = create_sand_tile(i)

	# 3 road variants
	for i in range(3):
		tile_textures["road_" + str(i)] = create_road_tile(i)

	# 3 floor variants
	for i in range(3):
		tile_textures["floor_" + str(i)] = create_floor_tile(i)

	# Generate object textures - 6 tree variants
	for i in range(6):
		object_textures["tree_" + str(i)] = create_tree_sprite(i)
		shadow_textures["tree_" + str(i)] = create_tree_shadow(i)

	# 4 rock variants
	for i in range(4):
		object_textures["rock_" + str(i)] = create_rock_sprite(i)
		shadow_textures["rock_" + str(i)] = create_rock_shadow(i)

	# 4 bush variants
	for i in range(4):
		object_textures["bush_" + str(i)] = create_bush_sprite(i)
		shadow_textures["bush_" + str(i)] = create_bush_shadow(i)

	# Furniture
	var furniture_types = ["bed", "table", "chair", "sink", "oven", "fridge", "couch", "dresser", "door"]
	for ftype in furniture_types:
		object_textures[ftype] = create_furniture_sprite(ftype)
		shadow_textures[ftype] = create_furniture_shadow()

	# Vehicles
	var vehicle_types = ["sedan", "suv", "truck", "van", "sports_car"]
	for vtype in vehicle_types:
		object_textures[vtype] = create_vehicle_sprite(vtype)
		shadow_textures[vtype] = create_vehicle_shadow()

	# Grass tuft overlays (4 variants)
	for i in range(4):
		grass_tuft_textures.append(create_grass_tuft(i))

# ========== TILE TEXTURE GENERATION (128x64 ISOMETRIC DIAMONDS) ==========

func create_grass_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Dark earth base (brownish-green)
	var base_color = Color(0.24, 0.30, 0.20, 1.0)

	# Fill base with diamond mask
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color

				# Large patch variation
				var patch_hash = hash_2d(x / 12, y / 12)
				if patch_hash < 0.3:
					color = color.darkened(0.1)
				elif patch_hash > 0.7:
					color = color.lightened(0.1)

				# Subtle lighting gradient
				var light_factor = 1.0 - (float(x) / TILE_WIDTH + float(y) / TILE_HEIGHT) / 2.0
				color = color.lerp(color.lightened(0.15), light_factor * 0.5)

				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Individual grass blade clusters (15-25 clusters)
	var cluster_count = 15 + (hash_int(variant, variant) % 11)
	for i in range(cluster_count):
		var cluster_x = hash_int(i * 7, variant * 11) % (TILE_WIDTH - 8) + 4
		var cluster_y = hash_int(i * 13, variant * 17) % (TILE_HEIGHT - 8) + 4

		# Check isometric bounds
		var dx = cluster_x - TILE_WIDTH / 2
		var dy = cluster_y - TILE_HEIGHT / 2
		var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

		if iso_dist <= 0.92:
			# 3-5 blades per cluster
			var blade_count = 3 + (hash_int(i, variant) % 3)
			for b in range(blade_count):
				var blade_offset_x = int((hash_2d(i, b) - 0.5) * 4.0)
				var blade_offset_y = int((hash_2d(b, i) - 0.5) * 4.0)
				var blade_x = cluster_x + blade_offset_x
				var blade_y = cluster_y + blade_offset_y
				var blade_height = 4 + (hash_int(i + b, variant) % 6)  # 4-9px tall

				# Blade color variation
				var color_t = hash_2d(blade_x, blade_y)
				var blade_color: Color
				if color_t < 0.33:
					blade_color = Color(0.20, 0.27, 0.14, 1.0)  # dark olive
				elif color_t < 0.67:
					blade_color = Color(0.28, 0.35, 0.19, 1.0)  # medium green
				else:
					blade_color = Color(0.37, 0.44, 0.24, 1.0)  # yellow-green

				# Draw blade with slight lean
				for h in range(blade_height):
					var lean = int((hash_2d(i, b) - 0.5) * 2.0) if h > blade_height / 2 else 0
					var px = blade_x + lean
					var py = blade_y - h

					if px >= 0 and px < TILE_WIDTH and py >= 0 and py < TILE_HEIGHT:
						var dx2 = px - TILE_WIDTH / 2
						var dy2 = py - TILE_HEIGHT / 2
						var iso_dist2 = abs(dx2) / float(TILE_WIDTH / 2) + abs(dy2) / float(TILE_HEIGHT / 2)
						if iso_dist2 <= 0.95:
							img.set_pixel(px, py, blade_color)
							# Wider base
							if h < blade_height / 3 and px + 1 < TILE_WIDTH:
								img.set_pixel(px + 1, py, blade_color.darkened(0.1))

	# Small wildflower dots (1-2 per tile)
	var flower_count = 1 + (hash_int(variant * 2, variant * 3) % 2)
	for i in range(flower_count):
		var fx = hash_int(i * 19, variant * 23) % (TILE_WIDTH - 4) + 2
		var fy = hash_int(i * 29, variant * 31) % (TILE_HEIGHT - 4) + 2

		var dx3 = fx - TILE_WIDTH / 2
		var dy3 = fy - TILE_HEIGHT / 2
		var iso_dist3 = abs(dx3) / float(TILE_WIDTH / 2) + abs(dy3) / float(TILE_HEIGHT / 2)

		if iso_dist3 <= 0.9:
			var flower_type = hash_2d(i, variant)
			var flower_color: Color
			if flower_type < 0.33:
				flower_color = Color(0.95, 0.90, 0.30, 1.0)  # yellow
			elif flower_type < 0.67:
				flower_color = Color(0.92, 0.92, 0.92, 1.0)  # white
			else:
				flower_color = Color(0.70, 0.45, 0.75, 1.0)  # purple

			img.set_pixel(fx, fy, flower_color)
			if fx + 1 < TILE_WIDTH:
				img.set_pixel(fx + 1, fy, flower_color)

	# Edge darkening for depth
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx4 = x - TILE_WIDTH / 2
			var dy4 = y - TILE_HEIGHT / 2
			var iso_dist4 = abs(dx4) / float(TILE_WIDTH / 2) + abs(dy4) / float(TILE_HEIGHT / 2)

			if iso_dist4 > 0.85 and iso_dist4 <= 1.0:
				var current = img.get_pixel(x, y)
				if current.a > 0:
					img.set_pixel(x, y, current.darkened(0.2))

	return ImageTexture.create_from_image(img)

func create_dirt_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Earth brown base
	var base_color = Color(0.38, 0.30, 0.22, 1.0)

	# Fill with noise and patches
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color

				# Large shade patches
				var patch_hash = hash_2d(x / 12, y / 12)
				if patch_hash < 0.25:
					color = Color(0.35, 0.28, 0.20, 1.0)
				elif patch_hash > 0.75:
					color = Color(0.41, 0.32, 0.24, 1.0)

				# Lighting
				var light_factor = 1.0 - (float(x) / TILE_WIDTH + float(y) / TILE_HEIGHT) / 2.0
				color = color.lerp(color.lightened(0.12), light_factor * 0.4)

				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Small pebble details (8-12 per tile, 2-3px)
	var pebble_count = 8 + (hash_int(variant, variant * 2) % 5)
	for i in range(pebble_count):
		var px = hash_int(i * 7, variant * 11) % (TILE_WIDTH - 6) + 3
		var py = hash_int(i * 13, variant * 17) % (TILE_HEIGHT - 6) + 3

		var dx = px - TILE_WIDTH / 2
		var dy = py - TILE_HEIGHT / 2
		var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

		if iso_dist <= 0.9:
			var pebble_shade = hash_2d(i, variant)
			var pebble_color: Color
			if pebble_shade < 0.5:
				pebble_color = Color(0.43, 0.41, 0.38, 1.0)
			else:
				pebble_color = Color(0.51, 0.49, 0.46, 1.0)

			var pebble_size = 2 + (hash_int(i, variant) % 2)
			for ps in range(pebble_size):
				if px + ps < TILE_WIDTH:
					img.set_pixel(px + ps, py, pebble_color)
				if py + ps < TILE_HEIGHT and ps < pebble_size - 1:
					img.set_pixel(px, py + ps, pebble_color.darkened(0.15))

	# Tire track impressions on variant 2-3
	if variant >= 2:
		var track_count = 2 + (hash_int(variant, variant * 3) % 2)
		for i in range(track_count):
			var tx = hash_int(i * 19, variant * 23) % (TILE_WIDTH - 16) + 8
			var ty = hash_int(i * 29, variant * 31) % (TILE_HEIGHT - 8) + 4
			var track_len = 8 + (hash_int(i, variant) % 6)
			var track_color = base_color.darkened(0.4)

			# Two parallel lines
			for t in range(track_len):
				var t_x = tx + t
				var t_y = ty
				if t_x < TILE_WIDTH and t_y < TILE_HEIGHT:
					var dx2 = t_x - TILE_WIDTH / 2
					var dy2 = t_y - TILE_HEIGHT / 2
					var iso_dist2 = abs(dx2) / float(TILE_WIDTH / 2) + abs(dy2) / float(TILE_HEIGHT / 2)
					if iso_dist2 <= 0.9:
						img.set_pixel(t_x, t_y, track_color)
						if t_y + 3 < TILE_HEIGHT:
							img.set_pixel(t_x, t_y + 3, track_color)

	# Crack patterns (2-4 per tile)
	var crack_count = 2 + (hash_int(variant * 5, variant * 7) % 3)
	for i in range(crack_count):
		var crack_x = hash_int(i * 37, variant * 41) % (TILE_WIDTH - 12) + 6
		var crack_y = hash_int(i * 43, variant * 47) % (TILE_HEIGHT - 12) + 6
		var crack_len = 6 + (hash_int(i, variant) % 8)
		var crack_color = base_color.darkened(0.5)
		var crack_dir = 1 if hash_2d(i, variant) > 0.5 else -1

		for c in range(crack_len):
			var cx = crack_x + c
			var cy = crack_y + c * crack_dir / 2
			if cx >= 0 and cx < TILE_WIDTH and cy >= 0 and cy < TILE_HEIGHT:
				var dx3 = cx - TILE_WIDTH / 2
				var dy3 = cy - TILE_HEIGHT / 2
				var iso_dist3 = abs(dx3) / float(TILE_WIDTH / 2) + abs(dy3) / float(TILE_HEIGHT / 2)
				if iso_dist3 <= 0.95:
					img.set_pixel(cx, cy, crack_color)

	# Subtle moisture variation (darker patches)
	var moisture_count = 6 + (hash_int(variant * 9, variant * 11) % 4)
	for i in range(moisture_count):
		var mx = hash_int(i * 53, variant * 59) % (TILE_WIDTH - 8) + 4
		var my = hash_int(i * 61, variant * 67) % (TILE_HEIGHT - 8) + 4
		var moist_size = 3 + (hash_int(i, variant) % 3)
		var moist_color = base_color.darkened(0.3)

		for mo in range(moist_size):
			if mx + mo < TILE_WIDTH:
				img.set_pixel(mx + mo, my, moist_color)
			if my + mo < TILE_HEIGHT and mo < moist_size - 1:
				img.set_pixel(mx, my + mo, moist_color)

	return ImageTexture.create_from_image(img)

func create_water_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Deep blue-green base
	var base_color = Color(0.16, 0.24, 0.34, 0.92)

	# Fill with depth gradient
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color

				# Depth gradient - darker toward center, lighter at edges
				color = color.lerp(color.darkened(0.18), 1.0 - iso_dist)

				# Tonal variation
				var patch_hash = hash_2d(x / 10, y / 10)
				if patch_hash < 0.3:
					color = color.darkened(0.1)
				elif patch_hash > 0.7:
					color = color.lightened(0.1)

				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Animated-look: concentric ripple circles (3-5 rings)
	var ripple_count = 3 + (hash_int(variant, variant * 2) % 3)
	for i in range(ripple_count):
		var ripple_cx = hash_int(i * 7, variant * 11) % (TILE_WIDTH - 20) + 10
		var ripple_cy = hash_int(i * 13, variant * 17) % (TILE_HEIGHT - 12) + 6
		var ripple_radius = 8 + (hash_int(i, variant) % 10)
		var ripple_color = base_color.lightened(0.20)

		# Draw partial elliptical arc
		for angle_deg in range(0, 360, 12):
			var angle = deg_to_rad(angle_deg)
			var rx = ripple_cx + int(cos(angle) * ripple_radius)
			var ry = ripple_cy + int(sin(angle) * ripple_radius * 0.5)

			if rx >= 0 and rx < TILE_WIDTH and ry >= 0 and ry < TILE_HEIGHT:
				var dx2 = rx - TILE_WIDTH / 2
				var dy2 = ry - TILE_HEIGHT / 2
				var iso_dist2 = abs(dx2) / float(TILE_WIDTH / 2) + abs(dy2) / float(TILE_HEIGHT / 2)
				if iso_dist2 <= 0.95 and hash_2d(angle_deg, i) > 0.25:
					img.set_pixel(rx, ry, ripple_color)

	# Caustic light patterns (8-12 irregular shapes)
	var caustic_count = 8 + (hash_int(variant * 3, variant * 5) % 5)
	for i in range(caustic_count):
		var cx = hash_int(i * 19, variant * 23) % (TILE_WIDTH - 8) + 4
		var cy = hash_int(i * 29, variant * 31) % (TILE_HEIGHT - 8) + 4

		var dx3 = cx - TILE_WIDTH / 2
		var dy3 = cy - TILE_HEIGHT / 2
		var iso_dist3 = abs(dx3) / float(TILE_WIDTH / 2) + abs(dy3) / float(TILE_HEIGHT / 2)

		if iso_dist3 <= 0.9:
			var caustic_color = Color(0.30, 0.42, 0.56, 0.92)
			var caustic_size = 2 + (hash_int(i, variant) % 3)

			# Irregular shape
			for cs in range(caustic_size):
				if cx + cs < TILE_WIDTH:
					img.set_pixel(cx + cs, cy, caustic_color)
				if cy + cs < TILE_HEIGHT and cs < caustic_size - 1:
					img.set_pixel(cx, cy + cs, caustic_color)
				if hash_2d(i, cs) > 0.6 and cx + cs < TILE_WIDTH and cy + cs < TILE_HEIGHT:
					img.set_pixel(cx + cs, cy + cs, caustic_color.lightened(0.1))

	# Shore foam effect at edges
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx4 = x - TILE_WIDTH / 2
			var dy4 = y - TILE_HEIGHT / 2
			var iso_dist4 = abs(dx4) / float(TILE_WIDTH / 2) + abs(dy4) / float(TILE_HEIGHT / 2)

			if iso_dist4 > 0.88 and iso_dist4 <= 1.0:
				if hash_2d(x, y) > 0.6:
					var foam_color = Color(0.72, 0.82, 0.88, 0.75)
					img.set_pixel(x, y, foam_color)

	return ImageTexture.create_from_image(img)

func create_stone_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Grey base with warm brown undertones
	var base_color = Color(0.48, 0.46, 0.44, 1.0)

	# Fill diamond
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color

				# Patch variation
				var patch_hash = hash_2d(x / 10, y / 10)
				if patch_hash < 0.3:
					color = Color(0.44, 0.42, 0.40, 1.0)
				elif patch_hash > 0.7:
					color = Color(0.52, 0.50, 0.48, 1.0)

				# Lighting
				var light_factor = 1.0 - (float(x) / TILE_WIDTH + float(y) / TILE_HEIGHT) / 2.0
				color = color.lerp(color.lightened(0.14), light_factor * 0.5)

				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Visible rock faces (angular shapes with highlight edges)
	var face_count = 4 + (hash_int(variant, variant * 2) % 3)
	for i in range(face_count):
		var face_x = hash_int(i * 7, variant * 11) % (TILE_WIDTH - 20) + 10
		var face_y = hash_int(i * 13, variant * 17) % (TILE_HEIGHT - 12) + 6
		var face_size = 8 + (hash_int(i, variant) % 8)
		var face_color = base_color.lightened(0.15)

		# Angular face
		for fs in range(face_size):
			var fx = face_x + fs
			var fy = face_y + fs / 2
			if fx < TILE_WIDTH and fy < TILE_HEIGHT:
				var dx2 = fx - TILE_WIDTH / 2
				var dy2 = fy - TILE_HEIGHT / 2
				var iso_dist2 = abs(dx2) / float(TILE_WIDTH / 2) + abs(dy2) / float(TILE_HEIGHT / 2)
				if iso_dist2 <= 0.95:
					img.set_pixel(fx, fy, face_color)
					# Highlight edge
					if fs == 0 and fy > 0:
						img.set_pixel(fx, fy - 1, face_color.lightened(0.2))

	# Crack lines (3-5 per tile)
	var crack_count = 3 + (hash_int(variant * 3, variant * 5) % 3)
	for i in range(crack_count):
		var crack_x = hash_int(i * 19, variant * 23) % (TILE_WIDTH - 12) + 6
		var crack_y = hash_int(i * 29, variant * 31) % (TILE_HEIGHT - 12) + 6
		var crack_len = 8 + (hash_int(i, variant) % 10)
		var crack_color = Color(0.28, 0.26, 0.24, 1.0)
		var crack_dir_x = 1 if hash_2d(i, variant) > 0.5 else -1
		var crack_dir_y = 1 if hash_2d(variant, i) > 0.5 else 0

		for c in range(crack_len):
			var cx = crack_x + c * crack_dir_x
			var cy = crack_y + c * crack_dir_y
			if cx >= 0 and cx < TILE_WIDTH and cy >= 0 and cy < TILE_HEIGHT:
				var dx3 = cx - TILE_WIDTH / 2
				var dy3 = cy - TILE_HEIGHT / 2
				var iso_dist3 = abs(dx3) / float(TILE_WIDTH / 2) + abs(dy3) / float(TILE_HEIGHT / 2)
				if iso_dist3 <= 0.95:
					img.set_pixel(cx, cy, crack_color)

	# Gravel scattering (20-30 tiny dots)
	var gravel_count = 20 + (hash_int(variant * 7, variant * 9) % 11)
	for i in range(gravel_count):
		var gx = hash_int(i * 37, variant * 41) % TILE_WIDTH
		var gy = hash_int(i * 43, variant * 47) % TILE_HEIGHT
		var dx4 = gx - TILE_WIDTH / 2
		var dy4 = gy - TILE_HEIGHT / 2
		var iso_dist4 = abs(dx4) / float(TILE_WIDTH / 2) + abs(dy4) / float(TILE_HEIGHT / 2)

		if iso_dist4 <= 0.9:
			var gravel_shade = hash_2d(i, variant)
			var gravel_color = base_color.lightened(0.1) if gravel_shade > 0.5 else base_color.darkened(0.1)
			img.set_pixel(gx, gy, gravel_color)

	# Moss patches (2-3 per tile, small green clusters in crevices)
	var moss_count = 2 + (hash_int(variant * 11, variant * 13) % 2)
	for i in range(moss_count):
		var mx = hash_int(i * 53, variant * 59) % (TILE_WIDTH - 8) + 4
		var my = hash_int(i * 61, variant * 67) % (TILE_HEIGHT - 6) + 3
		var moss_size = 2 + (hash_int(i, variant) % 3)
		var moss_color = Color(0.25, 0.38, 0.22, 1.0)

		for ms in range(moss_size):
			if mx + ms < TILE_WIDTH and my < TILE_HEIGHT:
				var dx5 = mx + ms - TILE_WIDTH / 2
				var dy5 = my - TILE_HEIGHT / 2
				var iso_dist5 = abs(dx5) / float(TILE_WIDTH / 2) + abs(dy5) / float(TILE_HEIGHT / 2)
				if iso_dist5 <= 0.9:
					img.set_pixel(mx + ms, my, moss_color)
					if my + 1 < TILE_HEIGHT:
						img.set_pixel(mx + ms, my + 1, moss_color.darkened(0.2))

	return ImageTexture.create_from_image(img)

func create_sand_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Warm tan/beige base
	var base_color = Color(0.82, 0.75, 0.58, 1.0)

	# Fill diamond
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color

				# Patch variation
				var patch_hash = hash_2d(x / 10, y / 10)
				if patch_hash < 0.3:
					color = color.darkened(0.08)
				elif patch_hash > 0.7:
					color = color.lightened(0.08)

				# Lighting
				var light_factor = 1.0 - (float(x) / TILE_WIDTH + float(y) / TILE_HEIGHT) / 2.0
				color = color.lerp(color.lightened(0.1), light_factor * 0.4)

				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Wind ripple lines (subtle curved lighter lines)
	var ripple_count = 4 + (hash_int(variant, variant * 2) % 3)
	for i in range(ripple_count):
		var ripple_y = hash_int(i * 7, variant * 11) % (TILE_HEIGHT - 8) + 4
		var ripple_color = base_color.lightened(0.12)

		for x in range(TILE_WIDTH):
			var wave_offset = int(sin(float(x) / 10.0 + float(i)) * 2.0)
			var ry = ripple_y + wave_offset
			if ry >= 0 and ry < TILE_HEIGHT:
				var dx = x - TILE_WIDTH / 2
				var dy = ry - TILE_HEIGHT / 2
				var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)
				if iso_dist <= 0.95:
					img.set_pixel(x, ry, ripple_color)

	# Shell fragments (tiny white/cream dots)
	var shell_count = 6 + (hash_int(variant * 3, variant * 5) % 5)
	for i in range(shell_count):
		var sx = hash_int(i * 13, variant * 17) % TILE_WIDTH
		var sy = hash_int(i * 19, variant * 23) % TILE_HEIGHT
		var dx2 = sx - TILE_WIDTH / 2
		var dy2 = sy - TILE_HEIGHT / 2
		var iso_dist2 = abs(dx2) / float(TILE_WIDTH / 2) + abs(dy2) / float(TILE_HEIGHT / 2)

		if iso_dist2 <= 0.9:
			var shell_color = Color(0.95, 0.92, 0.85, 1.0)
			img.set_pixel(sx, sy, shell_color)
			if hash_2d(i, variant) > 0.5 and sx + 1 < TILE_WIDTH:
				img.set_pixel(sx + 1, sy, shell_color.darkened(0.1))

	# Footprint impressions (slight darker ovals)
	var footprint_count = 1 + (hash_int(variant * 7, variant * 9) % 2)
	for i in range(footprint_count):
		var fx = hash_int(i * 29, variant * 31) % (TILE_WIDTH - 12) + 6
		var fy = hash_int(i * 37, variant * 41) % (TILE_HEIGHT - 8) + 4
		var footprint_color = base_color.darkened(0.15)

		# Oval shape
		for fo_x in range(-4, 5):
			for fo_y in range(-2, 3):
				if abs(fo_x) * 0.5 + abs(fo_y) <= 2.5:
					var pfx = fx + fo_x
					var pfy = fy + fo_y
					if pfx >= 0 and pfx < TILE_WIDTH and pfy >= 0 and pfy < TILE_HEIGHT:
						var dx3 = pfx - TILE_WIDTH / 2
						var dy3 = pfy - TILE_HEIGHT / 2
						var iso_dist3 = abs(dx3) / float(TILE_WIDTH / 2) + abs(dy3) / float(TILE_HEIGHT / 2)
						if iso_dist3 <= 0.95:
							img.set_pixel(pfx, pfy, footprint_color)

	return ImageTexture.create_from_image(img)

func create_road_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Dark asphalt grey base
	var base_color = Color(0.22, 0.22, 0.24, 1.0)

	# Fill diamond
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx = x - TILE_WIDTH / 2
			var dy = y - TILE_HEIGHT / 2
			var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

			if iso_dist <= 1.0:
				var color = base_color

				# Subtle patch variation
				var patch_hash = hash_2d(x / 10, y / 10)
				if patch_hash < 0.3:
					color = color.darkened(0.05)
				elif patch_hash > 0.7:
					color = color.lightened(0.05)

				img.set_pixel(x, y, color)
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Road line markings (faded yellow center line on variant 0)
	if variant == 0:
		var line_color = Color(0.85, 0.75, 0.25, 0.7)
		var center_x = TILE_WIDTH / 2

		for y in range(4, TILE_HEIGHT - 4, 6):
			for dash in range(4):
				var ly = y + dash
				if ly < TILE_HEIGHT:
					var dx = center_x - TILE_WIDTH / 2
					var dy = ly - TILE_HEIGHT / 2
					var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)
					if iso_dist <= 0.95:
						img.set_pixel(center_x, ly, line_color)
						if center_x + 1 < TILE_WIDTH:
							img.set_pixel(center_x + 1, ly, line_color)

	# Cracks and potholes
	var crack_count = 3 + (hash_int(variant, variant * 2) % 3)
	for i in range(crack_count):
		var crack_x = hash_int(i * 7, variant * 11) % (TILE_WIDTH - 12) + 6
		var crack_y = hash_int(i * 13, variant * 17) % (TILE_HEIGHT - 8) + 4
		var crack_len = 6 + (hash_int(i, variant) % 8)
		var crack_color = Color(0.10, 0.10, 0.12, 1.0)
		var crack_dir = 1 if hash_2d(i, variant) > 0.5 else -1

		for c in range(crack_len):
			var cx = crack_x + c
			var cy = crack_y + c * crack_dir / 2
			if cx >= 0 and cx < TILE_WIDTH and cy >= 0 and cy < TILE_HEIGHT:
				var dx2 = cx - TILE_WIDTH / 2
				var dy2 = cy - TILE_HEIGHT / 2
				var iso_dist2 = abs(dx2) / float(TILE_WIDTH / 2) + abs(dy2) / float(TILE_HEIGHT / 2)
				if iso_dist2 <= 0.95:
					img.set_pixel(cx, cy, crack_color)

	# Oil stains (2-3 per tile, slightly darker patches)
	var stain_count = 2 + (hash_int(variant * 3, variant * 5) % 2)
	for i in range(stain_count):
		var sx = hash_int(i * 19, variant * 23) % (TILE_WIDTH - 12) + 6
		var sy = hash_int(i * 29, variant * 31) % (TILE_HEIGHT - 8) + 4
		var stain_size = 4 + (hash_int(i, variant) % 4)
		var stain_color = base_color.darkened(0.25)

		# Irregular stain shape
		for so_x in range(-stain_size / 2, stain_size / 2 + 1):
			for so_y in range(-stain_size / 2, stain_size / 2 + 1):
				if hash_2d(so_x, so_y) > 0.3:
					var stx = sx + so_x
					var sty = sy + so_y
					if stx >= 0 and stx < TILE_WIDTH and sty >= 0 and sty < TILE_HEIGHT:
						var dx3 = stx - TILE_WIDTH / 2
						var dy3 = sty - TILE_HEIGHT / 2
						var iso_dist3 = abs(dx3) / float(TILE_WIDTH / 2) + abs(dy3) / float(TILE_HEIGHT / 2)
						if iso_dist3 <= 0.95:
							img.set_pixel(stx, sty, stain_color)

	# Gravel at edges (transitioning to lighter grey)
	for y in range(TILE_HEIGHT):
		for x in range(TILE_WIDTH):
			var dx4 = x - TILE_WIDTH / 2
			var dy4 = y - TILE_HEIGHT / 2
			var iso_dist4 = abs(dx4) / float(TILE_WIDTH / 2) + abs(dy4) / float(TILE_HEIGHT / 2)

			if iso_dist4 > 0.85 and iso_dist4 <= 1.0:
				if hash_2d(x, y) > 0.5:
					var gravel_color = Color(0.35, 0.35, 0.37, 1.0)
					img.set_pixel(x, y, gravel_color)

	return ImageTexture.create_from_image(img)

func create_floor_tile(variant: int) -> ImageTexture:
	var img = Image.create(TILE_WIDTH, TILE_HEIGHT, false, Image.FORMAT_RGBA8)

	if variant == 0:  # Wood planks
		var wood_color = Color(0.55, 0.42, 0.28, 1.0)

		# Fill diamond
		for y in range(TILE_HEIGHT):
			for x in range(TILE_WIDTH):
				var dx = x - TILE_WIDTH / 2
				var dy = y - TILE_HEIGHT / 2
				var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

				if iso_dist <= 1.0:
					var color = wood_color

					# Plank variation
					var plank_hash = hash_2d(x / 15, y / 10)
					if plank_hash < 0.33:
						color = color.darkened(0.08)
					elif plank_hash > 0.67:
						color = color.lightened(0.08)

					img.set_pixel(x, y, color)
				else:
					img.set_pixel(x, y, Color(0, 0, 0, 0))

		# Horizontal plank lines every 10px
		for y in range(0, TILE_HEIGHT, 10):
			for x in range(TILE_WIDTH):
				var dx = x - TILE_WIDTH / 2
				var dy = y - TILE_HEIGHT / 2
				var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)
				if iso_dist <= 0.98:
					img.set_pixel(x, y, wood_color.darkened(0.3))

		# Vertical wood grain lines
		var grain_count = 8 + (hash_int(variant, variant * 2) % 6)
		for i in range(grain_count):
			var gx = hash_int(i * 7, variant * 11) % TILE_WIDTH
			var grain_color = wood_color.darkened(0.15)

			for y in range(TILE_HEIGHT):
				var dx2 = gx - TILE_WIDTH / 2
				var dy2 = y - TILE_HEIGHT / 2
				var iso_dist2 = abs(dx2) / float(TILE_WIDTH / 2) + abs(dy2) / float(TILE_HEIGHT / 2)
				if iso_dist2 <= 0.95 and hash_2d(i, y) > 0.3:
					img.set_pixel(gx, y, grain_color)

		# Knot holes (2-3)
		var knot_count = 2 + (hash_int(variant * 3, variant * 5) % 2)
		for i in range(knot_count):
			var kx = hash_int(i * 13, variant * 17) % (TILE_WIDTH - 8) + 4
			var ky = hash_int(i * 19, variant * 23) % (TILE_HEIGHT - 6) + 3
			var knot_color = wood_color.darkened(0.5)

			# Small circular knot
			for ko_x in range(-2, 3):
				for ko_y in range(-1, 2):
					if abs(ko_x) + abs(ko_y) <= 2:
						var knx = kx + ko_x
						var kny = ky + ko_y
						if knx >= 0 and knx < TILE_WIDTH and kny >= 0 and kny < TILE_HEIGHT:
							var dx3 = knx - TILE_WIDTH / 2
							var dy3 = kny - TILE_HEIGHT / 2
							var iso_dist3 = abs(dx3) / float(TILE_WIDTH / 2) + abs(dy3) / float(TILE_HEIGHT / 2)
							if iso_dist3 <= 0.95:
								img.set_pixel(knx, kny, knot_color)

	elif variant == 1:  # Tile - grid pattern
		var tile_color_a = Color(0.75, 0.75, 0.77, 1.0)
		var tile_color_b = Color(0.70, 0.70, 0.72, 1.0)
		var grout_color = Color(0.50, 0.50, 0.52, 1.0)

		var tile_size = 12
		var grout_width = 1

		# Fill diamond
		for y in range(TILE_HEIGHT):
			for x in range(TILE_WIDTH):
				var dx = x - TILE_WIDTH / 2
				var dy = y - TILE_HEIGHT / 2
				var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

				if iso_dist <= 1.0:
					# Determine tile vs grout
					var tile_x = x % (tile_size + grout_width)
					var tile_y = y % (tile_size + grout_width)

					if tile_x < grout_width or tile_y < grout_width:
						img.set_pixel(x, y, grout_color)
					else:
						# Checkerboard pattern
						var checker = (x / (tile_size + grout_width) + y / (tile_size + grout_width)) % 2
						var color = tile_color_a if checker == 0 else tile_color_b
						img.set_pixel(x, y, color)
				else:
					img.set_pixel(x, y, Color(0, 0, 0, 0))

	else:  # variant == 2, Linoleum - smooth with scuff marks
		var lino_color = Color(0.62, 0.65, 0.60, 1.0)

		# Fill diamond
		for y in range(TILE_HEIGHT):
			for x in range(TILE_WIDTH):
				var dx = x - TILE_WIDTH / 2
				var dy = y - TILE_HEIGHT / 2
				var iso_dist = abs(dx) / float(TILE_WIDTH / 2) + abs(dy) / float(TILE_HEIGHT / 2)

				if iso_dist <= 1.0:
					var color = lino_color

					# Very subtle patch variation
					var patch_hash = hash_2d(x / 15, y / 15)
					if patch_hash < 0.4:
						color = color.darkened(0.03)
					elif patch_hash > 0.6:
						color = color.lightened(0.03)

					img.set_pixel(x, y, color)
				else:
					img.set_pixel(x, y, Color(0, 0, 0, 0))

		# Scuff marks (4-6 dark streaks)
		var scuff_count = 4 + (hash_int(variant, variant * 2) % 3)
		for i in range(scuff_count):
			var scuff_x = hash_int(i * 7, variant * 11) % (TILE_WIDTH - 10) + 5
			var scuff_y = hash_int(i * 13, variant * 17) % (TILE_HEIGHT - 8) + 4
			var scuff_len = 4 + (hash_int(i, variant) % 6)
			var scuff_color = lino_color.darkened(0.25)
			var scuff_dir_x = 1 if hash_2d(i, variant) > 0.5 else -1

			for s in range(scuff_len):
				var scx = scuff_x + s * scuff_dir_x
				var scy = scuff_y
				if scx >= 0 and scx < TILE_WIDTH and scy >= 0 and scy < TILE_HEIGHT:
					var dx2 = scx - TILE_WIDTH / 2
					var dy2 = scy - TILE_HEIGHT / 2
					var iso_dist2 = abs(dx2) / float(TILE_WIDTH / 2) + abs(dy2) / float(TILE_HEIGHT / 2)
					if iso_dist2 <= 0.95:
						img.set_pixel(scx, scy, scuff_color)

	return ImageTexture.create_from_image(img)

# ========== OBJECT SPRITE GENERATION ==========

func create_tree_sprite(variant: int) -> ImageTexture:
	var img = Image.create(OBJECT_TREE_WIDTH, OBJECT_TREE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_TREE_HEIGHT):
		for x in range(OBJECT_TREE_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	var is_conifer = (variant == 5)  # Variant 5 is conifer

	# Trunk position (centered horizontally, bottom 40% of sprite)
	var trunk_bottom_y = OBJECT_TREE_HEIGHT - 10
	var trunk_top_y = OBJECT_TREE_HEIGHT - 80
	var trunk_center_x = OBJECT_TREE_WIDTH / 2
	var trunk_width = 12 + (hash_int(variant, variant * 2) % 5)  # 12-16px

	# Trunk colors
	var bark_base = Color(0.25, 0.18, 0.12, 1.0)
	var bark_highlight = Color(0.32, 0.24, 0.16, 1.0)
	var bark_shadow = Color(0.18, 0.12, 0.08, 1.0)

	# Draw trunk with visible bark texture
	for y in range(trunk_top_y, trunk_bottom_y + 1):
		var trunk_progress = float(y - trunk_top_y) / float(trunk_bottom_y - trunk_top_y)
		var current_width = trunk_width

		# Root flare - slight widening at base
		if trunk_progress > 0.8:
			current_width = trunk_width + int((trunk_progress - 0.8) * 12.0)

		for x in range(trunk_center_x - current_width / 2, trunk_center_x + current_width / 2):
			if x >= 0 and x < OBJECT_TREE_WIDTH:
				var rel_x = x - (trunk_center_x - current_width / 2)
				var bark_color = bark_base

				# Left side darker (shadow), right side lighter (sun)
				if rel_x < current_width / 3:
					bark_color = bark_shadow
				elif rel_x > current_width * 2 / 3:
					bark_color = bark_highlight

				# Vertical bark ridges
				if hash_2d(x, y / 8) > 0.6:
					bark_color = bark_color.lightened(0.1)

				img.set_pixel(x, y, bark_color)

	if is_conifer:
		# Conifer - triangular silhouette with darker green needles
		var tree_bottom_y = trunk_top_y
		var tree_top_y = 20
		var base_width = 50

		var needle_dark = Color(0.15, 0.25, 0.18, 1.0)
		var needle_mid = Color(0.20, 0.30, 0.22, 1.0)
		var needle_light = Color(0.25, 0.35, 0.26, 1.0)

		for y in range(tree_top_y, tree_bottom_y):
			var tree_progress = float(y - tree_top_y) / float(tree_bottom_y - tree_top_y)
			var current_width = int(base_width * tree_progress)

			# Jagged edges for needle clusters
			var left_edge = trunk_center_x - current_width / 2
			var right_edge = trunk_center_x + current_width / 2

			for x in range(left_edge, right_edge + 1):
				if x >= 0 and x < OBJECT_TREE_WIDTH:
					# Skip some pixels for irregular silhouette
					if hash_2d(x, y) < 0.15:
						continue

					var rel_x = x - left_edge
					var needle_color = needle_mid

					# Shading - left darker, right lighter
					if rel_x < current_width / 3:
						needle_color = needle_dark
					elif rel_x > current_width * 2 / 3:
						needle_color = needle_light

					# Top highlight
					if y < tree_top_y + 30:
						needle_color = needle_color.lightened(0.15)

					img.set_pixel(x, y, needle_color)

	else:
		# Deciduous - branch structure + rounded leaf canopy
		var canopy_center_y = trunk_top_y - 30
		var canopy_radius = 40 + (hash_int(variant, variant * 3) % 15)

		# Branch structure (3-5 main branches)
		var branch_count = 3 + (hash_int(variant, variant * 2) % 3)
		var branch_color = bark_base.lightened(0.1)

		for i in range(branch_count):
			var angle = (float(i) / branch_count) * PI * 2.0 + hash_2d(i, variant) * 0.5
			var branch_len = 15 + (hash_int(i, variant) % 15)

			for b in range(branch_len):
				var bx = trunk_center_x + int(cos(angle) * b)
				var by = trunk_top_y - b / 2
				if bx >= 0 and bx < OBJECT_TREE_WIDTH and by >= 0 and by < OBJECT_TREE_HEIGHT:
					img.set_pixel(bx, by, branch_color)
					if bx + 1 < OBJECT_TREE_WIDTH:
						img.set_pixel(bx + 1, by, branch_color)

		# Leaf canopy - dense overlapping clusters (25-40 clusters)
		var cluster_count = 25 + (hash_int(variant, variant * 5) % 16)

		for i in range(cluster_count):
			var cluster_angle = hash_2d(i, variant) * PI * 2.0
			var cluster_dist = hash_2d(variant, i) * canopy_radius
			var cluster_x = trunk_center_x + int(cos(cluster_angle) * cluster_dist)
			var cluster_y = canopy_center_y + int(sin(cluster_angle) * cluster_dist * 0.6)  # Elliptical
			var cluster_size = 6 + (hash_int(i, variant) % 5)

			# Cluster color variation
			var color_variant = hash_2d(cluster_x, cluster_y)
			var leaf_color: Color
			if color_variant < 0.33:
				leaf_color = Color(0.22, 0.35, 0.18, 1.0)  # dark undersides
			elif color_variant < 0.67:
				leaf_color = Color(0.30, 0.45, 0.24, 1.0)  # mid green
			else:
				leaf_color = Color(0.40, 0.55, 0.32, 1.0)  # bright highlights on top

			# Draw irregular blob cluster
			for cx_off in range(-cluster_size / 2, cluster_size / 2 + 1):
				for cy_off in range(-cluster_size / 2, cluster_size / 2 + 1):
					if abs(cx_off) + abs(cy_off) <= cluster_size / 2:
						if hash_2d(cx_off, cy_off) > 0.3:
							var px = cluster_x + cx_off
							var py = cluster_y + cy_off
							if px >= 0 and px < OBJECT_TREE_WIDTH and py >= 0 and py < OBJECT_TREE_HEIGHT:
								img.set_pixel(px, py, leaf_color)

		# 3D volume - highlight ring on upper-right for rounded appearance
		var highlight_color = Color(0.48, 0.63, 0.40, 1.0)
		for angle_deg in range(-60, 61, 10):
			var angle = deg_to_rad(angle_deg)
			var hx = trunk_center_x + int(cos(angle) * (canopy_radius - 5))
			var hy = canopy_center_y - 15 + int(sin(angle) * (canopy_radius - 5) * 0.6)
			if hx >= 0 and hx < OBJECT_TREE_WIDTH and hy >= 0 and hy < OBJECT_TREE_HEIGHT:
				var current = img.get_pixel(hx, hy)
				if current.a > 0:
					img.set_pixel(hx, hy, highlight_color)

	return ImageTexture.create_from_image(img)

func create_tree_shadow(variant: int) -> ImageTexture:
	var img = Image.create(OBJECT_TREE_WIDTH, OBJECT_TREE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_TREE_HEIGHT):
		for x in range(OBJECT_TREE_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Large elliptical shadow (60x20)
	var shadow_cx = OBJECT_TREE_WIDTH / 2
	var shadow_cy = OBJECT_TREE_HEIGHT - 8
	var shadow_width = 60
	var shadow_height = 20
	var shadow_color = Color(0, 0, 0, 0.3)

	for y in range(shadow_cy - shadow_height / 2, shadow_cy + shadow_height / 2):
		for x in range(shadow_cx - shadow_width / 2, shadow_cx + shadow_width / 2):
			if x >= 0 and x < OBJECT_TREE_WIDTH and y >= 0 and y < OBJECT_TREE_HEIGHT:
				var dx = float(x - shadow_cx) / (shadow_width / 2)
				var dy = float(y - shadow_cy) / (shadow_height / 2)
				var dist = sqrt(dx * dx + dy * dy)

				if dist <= 1.0:
					# Soft edges
					var alpha = 0.3 * (1.0 - dist * 0.5)
					img.set_pixel(x, y, Color(0, 0, 0, alpha))

	return ImageTexture.create_from_image(img)

func create_rock_sprite(variant: int) -> ImageTexture:
	var img = Image.create(OBJECT_ROCK_WIDTH, OBJECT_ROCK_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_ROCK_HEIGHT):
		for x in range(OBJECT_ROCK_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Rock colors - 3D faces
	var rock_top = Color(0.58, 0.56, 0.54, 1.0)  # brightest (top face, direct light)
	var rock_front = Color(0.48, 0.46, 0.44, 1.0)  # medium (front face)
	var rock_side = Color(0.36, 0.34, 0.32, 1.0)  # darkest (side face, shadow)

	# Rock center
	var rock_cx = OBJECT_ROCK_WIDTH / 2
	var rock_cy = OBJECT_ROCK_HEIGHT / 2
	var rock_size = 20 + (hash_int(variant, variant * 2) % 8)

	# Top face (brightest, upper portion)
	for y in range(rock_cy - rock_size / 2, rock_cy):
		for x in range(rock_cx - rock_size / 2, rock_cx + rock_size / 2):
			if x >= 0 and x < OBJECT_ROCK_WIDTH and y >= 0 and y < OBJECT_ROCK_HEIGHT:
				if hash_2d(x, y) > 0.2:  # Irregular edges
					img.set_pixel(x, y, rock_top)

	# Front face (medium brightness, lower-center)
	for y in range(rock_cy, rock_cy + rock_size / 2):
		for x in range(rock_cx - rock_size / 3, rock_cx + rock_size / 3):
			if x >= 0 and x < OBJECT_ROCK_WIDTH and y >= 0 and y < OBJECT_ROCK_HEIGHT:
				if hash_2d(x, y) > 0.2:
					img.set_pixel(x, y, rock_front)

	# Side face (darkest, left side)
	for y in range(rock_cy - rock_size / 3, rock_cy + rock_size / 2):
		for x in range(rock_cx - rock_size / 2, rock_cx - rock_size / 3):
			if x >= 0 and x < OBJECT_ROCK_WIDTH and y >= 0 and y < OBJECT_ROCK_HEIGHT:
				if hash_2d(x, y) > 0.3:
					img.set_pixel(x, y, rock_side)

	# Edge highlighting (1px lighter edge on top)
	for x in range(rock_cx - rock_size / 2, rock_cx + rock_size / 2):
		var y = rock_cy - rock_size / 2
		if x >= 0 and x < OBJECT_ROCK_WIDTH and y >= 0 and y < OBJECT_ROCK_HEIGHT:
			var current = img.get_pixel(x, y)
			if current.a > 0:
				img.set_pixel(x, y, current.lightened(0.2))

	# 1px darker edge on bottom
	for x in range(rock_cx - rock_size / 2, rock_cx + rock_size / 2):
		var y = rock_cy + rock_size / 2 - 1
		if x >= 0 and x < OBJECT_ROCK_WIDTH and y >= 0 and y < OBJECT_ROCK_HEIGHT:
			var current = img.get_pixel(x, y)
			if current.a > 0:
				img.set_pixel(x, y, current.darkened(0.3))

	# Small crack lines (2-3)
	var crack_count = 2 + (hash_int(variant, variant * 3) % 2)
	for i in range(crack_count):
		var crack_x = rock_cx - rock_size / 4 + (hash_int(i, variant) % (rock_size / 2))
		var crack_y = rock_cy - rock_size / 4 + (hash_int(variant, i) % (rock_size / 2))
		var crack_len = 4 + (hash_int(i, variant * 2) % 6)
		var crack_color = rock_side.darkened(0.3)

		for c in range(crack_len):
			var cx = crack_x + c
			var cy = crack_y + c / 2
			if cx >= 0 and cx < OBJECT_ROCK_WIDTH and cy >= 0 and cy < OBJECT_ROCK_HEIGHT:
				var current = img.get_pixel(cx, cy)
				if current.a > 0:
					img.set_pixel(cx, cy, crack_color)

	# Lichen spots (2-3 green patches)
	var lichen_count = 2 + (hash_int(variant * 5, variant * 7) % 2)
	for i in range(lichen_count):
		var lichen_x = rock_cx - rock_size / 3 + (hash_int(i * 7, variant * 11) % (rock_size / 2))
		var lichen_y = rock_cy - rock_size / 3 + (hash_int(i * 13, variant * 17) % (rock_size / 2))
		var lichen_size = 2 + (hash_int(i, variant) % 3)
		var lichen_color = Color(0.28, 0.42, 0.25, 1.0)

		for lo in range(lichen_size):
			if lichen_x + lo < OBJECT_ROCK_WIDTH and lichen_y < OBJECT_ROCK_HEIGHT:
				var current = img.get_pixel(lichen_x + lo, lichen_y)
				if current.a > 0:
					img.set_pixel(lichen_x + lo, lichen_y, lichen_color)

	return ImageTexture.create_from_image(img)

func create_rock_shadow(variant: int) -> ImageTexture:
	var img = Image.create(OBJECT_ROCK_WIDTH, OBJECT_ROCK_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_ROCK_HEIGHT):
		for x in range(OBJECT_ROCK_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Smaller shadow (40x12)
	var shadow_cx = OBJECT_ROCK_WIDTH / 2
	var shadow_cy = OBJECT_ROCK_HEIGHT - 4
	var shadow_width = 40
	var shadow_height = 12

	for y in range(shadow_cy - shadow_height / 2, shadow_cy + shadow_height / 2):
		for x in range(shadow_cx - shadow_width / 2, shadow_cx + shadow_width / 2):
			if x >= 0 and x < OBJECT_ROCK_WIDTH and y >= 0 and y < OBJECT_ROCK_HEIGHT:
				var dx = float(x - shadow_cx) / (shadow_width / 2)
				var dy = float(y - shadow_cy) / (shadow_height / 2)
				var dist = sqrt(dx * dx + dy * dy)

				if dist <= 1.0:
					var alpha = 0.25 * (1.0 - dist * 0.5)
					img.set_pixel(x, y, Color(0, 0, 0, alpha))

	return ImageTexture.create_from_image(img)

func create_bush_sprite(variant: int) -> ImageTexture:
	var img = Image.create(OBJECT_BUSH_WIDTH, OBJECT_BUSH_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_BUSH_HEIGHT):
		for x in range(OBJECT_BUSH_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	var is_berry_bush = (variant >= 2)

	# Bush center
	var bush_cx = OBJECT_BUSH_WIDTH / 2
	var bush_cy = OBJECT_BUSH_HEIGHT / 2
	var bush_radius = 16 + (hash_int(variant, variant * 2) % 6)

	# Leaf colors
	var leaf_dark = Color(0.22, 0.32, 0.20, 1.0)  # darker at base
	var leaf_mid = Color(0.30, 0.42, 0.26, 1.0)
	var leaf_light = Color(0.40, 0.52, 0.34, 1.0)  # lighter on top

	# Rounded form - semi-spherical leaf mass
	for y in range(bush_cy - bush_radius, bush_cy + bush_radius):
		for x in range(bush_cx - bush_radius, bush_cx + bush_radius):
			if x >= 0 and x < OBJECT_BUSH_WIDTH and y >= 0 and y < OBJECT_BUSH_HEIGHT:
				var dx = float(x - bush_cx)
				var dy = float(y - bush_cy) * 1.2  # Slightly elliptical
				var dist = sqrt(dx * dx + dy * dy)

				if dist <= bush_radius:
					# Skip some pixels for irregular silhouette
					if hash_2d(x, y) < 0.2:
						continue

					# Shading - darker at base, lighter on top
					var leaf_color = leaf_mid
					if y > bush_cy + bush_radius / 3:
						leaf_color = leaf_dark
					elif y < bush_cy - bush_radius / 3:
						leaf_color = leaf_light

					img.set_pixel(x, y, leaf_color)

	# Individual leaves (small 2-3px leaf shapes, not just noise)
	var leaf_cluster_count = 15 + (hash_int(variant, variant * 3) % 10)
	for i in range(leaf_cluster_count):
		var angle = hash_2d(i, variant) * PI * 2.0
		var dist = hash_2d(variant, i) * (bush_radius - 4)
		var lx = bush_cx + int(cos(angle) * dist)
		var ly = bush_cy + int(sin(angle) * dist * 0.8)

		if lx >= 2 and lx < OBJECT_BUSH_WIDTH - 2 and ly >= 2 and ly < OBJECT_BUSH_HEIGHT - 2:
			var leaf_shape_color = leaf_light if ly < bush_cy else leaf_dark

			# Small leaf shape (2-3px)
			img.set_pixel(lx, ly, leaf_shape_color)
			img.set_pixel(lx + 1, ly, leaf_shape_color)
			img.set_pixel(lx, ly + 1, leaf_shape_color.darkened(0.1))

	# Berry bushes - small red/blue dots scattered on surface
	if is_berry_bush:
		var berry_color = Color(0.75, 0.20, 0.25, 1.0) if variant == 2 else Color(0.25, 0.30, 0.65, 1.0)
		var berry_count = 6 + (hash_int(variant, variant * 5) % 6)

		for i in range(berry_count):
			var angle = hash_2d(i * 7, variant * 11) * PI * 2.0
			var dist = hash_2d(variant * 13, i * 17) * (bush_radius - 6)
			var berry_x = bush_cx + int(cos(angle) * dist)
			var berry_y = bush_cy + int(sin(angle) * dist * 0.8)

			if berry_x >= 1 and berry_x < OBJECT_BUSH_WIDTH - 1 and berry_y >= 1 and berry_y < OBJECT_BUSH_HEIGHT - 1:
				var current = img.get_pixel(berry_x, berry_y)
				if current.a > 0:
					img.set_pixel(berry_x, berry_y, berry_color)
					img.set_pixel(berry_x + 1, berry_y, berry_color.darkened(0.2))

	# Small branches visible at bottom edge
	var branch_count = 3 + (hash_int(variant, variant * 7) % 3)
	var branch_color = Color(0.22, 0.16, 0.12, 1.0)

	for i in range(branch_count):
		var branch_x = bush_cx - bush_radius / 2 + (hash_int(i, variant) % bush_radius)
		var branch_bottom_y = bush_cy + bush_radius - 2
		var branch_len = 3 + (hash_int(variant, i) % 4)

		for b in range(branch_len):
			var by = branch_bottom_y - b
			if branch_x >= 0 and branch_x < OBJECT_BUSH_WIDTH and by >= 0 and by < OBJECT_BUSH_HEIGHT:
				img.set_pixel(branch_x, by, branch_color)

	return ImageTexture.create_from_image(img)

func create_bush_shadow(variant: int) -> ImageTexture:
	var img = Image.create(OBJECT_BUSH_WIDTH, OBJECT_BUSH_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_BUSH_HEIGHT):
		for x in range(OBJECT_BUSH_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Medium shadow (36x14)
	var shadow_cx = OBJECT_BUSH_WIDTH / 2
	var shadow_cy = OBJECT_BUSH_HEIGHT - 4
	var shadow_width = 36
	var shadow_height = 14

	for y in range(shadow_cy - shadow_height / 2, shadow_cy + shadow_height / 2):
		for x in range(shadow_cx - shadow_width / 2, shadow_cx + shadow_width / 2):
			if x >= 0 and x < OBJECT_BUSH_WIDTH and y >= 0 and y < OBJECT_BUSH_HEIGHT:
				var dx = float(x - shadow_cx) / (shadow_width / 2)
				var dy = float(y - shadow_cy) / (shadow_height / 2)
				var dist = sqrt(dx * dx + dy * dy)

				if dist <= 1.0:
					var alpha = 0.28 * (1.0 - dist * 0.5)
					img.set_pixel(x, y, Color(0, 0, 0, alpha))

	return ImageTexture.create_from_image(img)

func create_furniture_sprite(ftype: String) -> ImageTexture:
	var img = Image.create(OBJECT_FURNITURE_SIZE, OBJECT_FURNITURE_SIZE, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_FURNITURE_SIZE):
		for x in range(OBJECT_FURNITURE_SIZE):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	match ftype:
		"bed":
			# Rectangle with pillow (white) at one end, colored blanket
			var bed_color = Color(0.45, 0.35, 0.30, 1.0)  # brown frame
			var blanket_color = Color(0.55, 0.40, 0.42, 1.0)
			var pillow_color = Color(0.92, 0.90, 0.88, 1.0)

			# Frame
			for y in range(12, 52):
				for x in range(10, 54):
					if y >= 12 and y <= 14 or y >= 50 and y <= 52 or x >= 10 and x <= 12 or x >= 52 and x <= 54:
						img.set_pixel(x, y, bed_color)

			# Blanket
			for y in range(18, 48):
				for x in range(14, 50):
					img.set_pixel(x, y, blanket_color)

			# Pillow
			for y in range(14, 22):
				for x in range(18, 46):
					img.set_pixel(x, y, pillow_color)

		"table":
			# Rectangular top with visible legs (4 darker rectangles at corners)
			var table_top_color = Color(0.55, 0.42, 0.28, 1.0)
			var leg_color = Color(0.40, 0.30, 0.20, 1.0)

			# Legs
			for leg_x in [14, 48]:
				for leg_y in [14, 48]:
					for y in range(leg_y, 54):
						for x in range(leg_x, leg_x + 4):
							if x < OBJECT_FURNITURE_SIZE and y < OBJECT_FURNITURE_SIZE:
								img.set_pixel(x, y, leg_color)

			# Top
			for y in range(10, 26):
				for x in range(12, 52):
					img.set_pixel(x, y, table_top_color)

		"chair":
			# Small seat with back, visible legs
			var chair_color = Color(0.50, 0.38, 0.26, 1.0)
			var seat_color = Color(0.58, 0.44, 0.30, 1.0)

			# Legs (front)
			for leg_x in [20, 42]:
				for y in range(40, 54):
					for x in range(leg_x, leg_x + 3):
						if x < OBJECT_FURNITURE_SIZE:
							img.set_pixel(x, y, chair_color)

			# Seat
			for y in range(34, 42):
				for x in range(18, 46):
					img.set_pixel(x, y, seat_color)

			# Back
			for y in range(10, 36):
				for x in range(18, 22):
					img.set_pixel(x, y, chair_color)

		"sink":
			# Basin shape with faucet detail
			var basin_color = Color(0.85, 0.85, 0.87, 1.0)
			var faucet_color = Color(0.70, 0.72, 0.75, 1.0)

			# Basin (oval)
			for y in range(28, 48):
				for x in range(16, 48):
					var dx = float(x - 32) / 16.0
					var dy = float(y - 38) / 10.0
					if dx * dx + dy * dy <= 1.0:
						img.set_pixel(x, y, basin_color)

			# Faucet
			for y in range(18, 30):
				for x in range(30, 34):
					img.set_pixel(x, y, faucet_color)
			for x in range(26, 38):
				img.set_pixel(x, 18, faucet_color)

		"oven":
			# Rectangle with burner circles on top
			var oven_color = Color(0.28, 0.28, 0.30, 1.0)
			var burner_color = Color(0.15, 0.15, 0.17, 1.0)

			# Body
			for y in range(10, 54):
				for x in range(12, 52):
					img.set_pixel(x, y, oven_color)

			# Burners (4 circles)
			var burner_positions = [[20, 18], [42, 18], [20, 30], [42, 30]]
			for pos in burner_positions:
				var burner_cx = pos[0]
				var burner_cy = pos[1]
				for y in range(burner_cy - 4, burner_cy + 5):
					for x in range(burner_cx - 4, burner_cx + 5):
						if x >= 0 and x < OBJECT_FURNITURE_SIZE and y >= 0 and y < OBJECT_FURNITURE_SIZE:
							var dx = x - burner_cx
							var dy = y - burner_cy
							if dx * dx + dy * dy <= 16:
								img.set_pixel(x, y, burner_color)

		"fridge":
			# Tall rectangle with handle line, door seam
			var fridge_color = Color(0.88, 0.88, 0.90, 1.0)
			var handle_color = Color(0.65, 0.65, 0.68, 1.0)
			var seam_color = Color(0.70, 0.70, 0.72, 1.0)

			# Body
			for y in range(8, 56):
				for x in range(16, 48):
					img.set_pixel(x, y, fridge_color)

			# Door seam (horizontal line)
			for x in range(16, 48):
				img.set_pixel(x, 32, seam_color)

			# Handle
			for y in range(28, 36):
				for x in range(44, 46):
					if x < OBJECT_FURNITURE_SIZE:
						img.set_pixel(x, y, handle_color)

		"couch":
			# Wide seat with armrests and back cushions
			var couch_color = Color(0.48, 0.42, 0.38, 1.0)
			var cushion_color = Color(0.55, 0.48, 0.44, 1.0)

			# Back
			for y in range(14, 32):
				for x in range(10, 54):
					img.set_pixel(x, y, couch_color)

			# Seat
			for y in range(32, 46):
				for x in range(10, 54):
					img.set_pixel(x, y, cushion_color)

			# Armrests
			for y in range(20, 46):
				for x in range(10, 14):
					img.set_pixel(x, y, couch_color)
				for x in range(50, 54):
					img.set_pixel(x, y, couch_color)

		"dresser":
			# Rectangle with drawer lines (3-4 horizontal lines with knob dots)
			var dresser_color = Color(0.52, 0.40, 0.28, 1.0)
			var knob_color = Color(0.30, 0.22, 0.16, 1.0)

			# Body
			for y in range(12, 52):
				for x in range(14, 50):
					img.set_pixel(x, y, dresser_color)

			# Drawer lines
			for drawer_y in [20, 28, 36, 44]:
				for x in range(14, 50):
					img.set_pixel(x, drawer_y, dresser_color.darkened(0.3))
				# Knobs
				img.set_pixel(30, drawer_y, knob_color)
				img.set_pixel(31, drawer_y, knob_color)
				img.set_pixel(32, drawer_y, knob_color)

		"door":
			# Vertical rectangle with handle and hinges, panel detail
			var door_color = Color(0.58, 0.45, 0.32, 1.0)
			var handle_color = Color(0.65, 0.60, 0.55, 1.0)
			var panel_color = Color(0.52, 0.40, 0.28, 1.0)

			# Door body
			for y in range(6, 58):
				for x in range(20, 44):
					img.set_pixel(x, y, door_color)

			# Panel inset
			for y in range(12, 50):
				for x in range(24, 40):
					if y >= 12 and y <= 14 or y >= 48 and y <= 50 or x >= 24 and x <= 26 or x >= 38 and x <= 40:
						img.set_pixel(x, y, panel_color)

			# Handle
			for y in range(30, 34):
				for x in range(38, 42):
					if x < OBJECT_FURNITURE_SIZE:
						img.set_pixel(x, y, handle_color)

			# Hinges
			for hinge_y in [12, 50]:
				for y in range(hinge_y, hinge_y + 3):
					for x in range(20, 24):
						img.set_pixel(x, y, handle_color)

	return ImageTexture.create_from_image(img)

func create_furniture_shadow() -> ImageTexture:
	var img = Image.create(OBJECT_FURNITURE_SIZE, OBJECT_FURNITURE_SIZE, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_FURNITURE_SIZE):
		for x in range(OBJECT_FURNITURE_SIZE):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Medium shadow
	var shadow_cx = OBJECT_FURNITURE_SIZE / 2
	var shadow_cy = OBJECT_FURNITURE_SIZE - 6
	var shadow_width = 42
	var shadow_height = 16

	for y in range(shadow_cy - shadow_height / 2, shadow_cy + shadow_height / 2):
		for x in range(shadow_cx - shadow_width / 2, shadow_cx + shadow_width / 2):
			if x >= 0 and x < OBJECT_FURNITURE_SIZE and y >= 0 and y < OBJECT_FURNITURE_SIZE:
				var dx = float(x - shadow_cx) / (shadow_width / 2)
				var dy = float(y - shadow_cy) / (shadow_height / 2)
				var dist = sqrt(dx * dx + dy * dy)

				if dist <= 1.0:
					var alpha = 0.22 * (1.0 - dist * 0.5)
					img.set_pixel(x, y, Color(0, 0, 0, alpha))

	return ImageTexture.create_from_image(img)

func create_vehicle_sprite(vtype: String) -> ImageTexture:
	var img = Image.create(OBJECT_VEHICLE_WIDTH, OBJECT_VEHICLE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_VEHICLE_HEIGHT):
		for x in range(OBJECT_VEHICLE_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	match vtype:
		"sedan":
			# Classic car silhouette, windshield reflection, wheel circles, door lines
			var body_color = Color(0.35, 0.40, 0.50, 1.0)
			var window_color = Color(0.55, 0.65, 0.75, 0.6)
			var wheel_color = Color(0.15, 0.15, 0.17, 1.0)

			# Body
			for y in range(20, 60):
				for x in range(15, 113):
					img.set_pixel(x, y, body_color)

			# Roof
			for y in range(10, 20):
				for x in range(35, 93):
					img.set_pixel(x, y, body_color)

			# Windshield
			for y in range(12, 20):
				for x in range(40, 60):
					img.set_pixel(x, y, window_color)

			# Side windows
			for y in range(12, 20):
				for x in range(65, 88):
					img.set_pixel(x, y, window_color)

			# Wheels
			for wheel_x in [30, 95]:
				for y in range(52, 68):
					for x in range(wheel_x, wheel_x + 12):
						if x < OBJECT_VEHICLE_WIDTH and y < OBJECT_VEHICLE_HEIGHT:
							var dx = x - (wheel_x + 6)
							var dy = y - 60
							if dx * dx + dy * dy <= 36:
								img.set_pixel(x, y, wheel_color)

			# Door lines
			for y in range(22, 58):
				img.set_pixel(64, y, body_color.darkened(0.3))

		"suv":
			# Taller profile, roof rack suggestion, larger wheels
			var body_color = Color(0.28, 0.32, 0.28, 1.0)
			var window_color = Color(0.50, 0.60, 0.70, 0.6)
			var wheel_color = Color(0.15, 0.15, 0.17, 1.0)

			# Body
			for y in range(15, 62):
				for x in range(15, 113):
					img.set_pixel(x, y, body_color)

			# Roof
			for y in range(5, 15):
				for x in range(30, 98):
					img.set_pixel(x, y, body_color)

			# Roof rack
			for x in range(35, 93, 8):
				for rack_x in range(x, x + 2):
					if rack_x < OBJECT_VEHICLE_WIDTH:
						img.set_pixel(rack_x, 4, Color(0.60, 0.60, 0.62, 1.0))

			# Windshield
			for y in range(8, 15):
				for x in range(35, 55):
					img.set_pixel(x, y, window_color)

			# Side windows
			for y in range(8, 15):
				for x in range(60, 93):
					img.set_pixel(x, y, window_color)

			# Larger wheels
			for wheel_x in [28, 92]:
				for y in range(50, 70):
					for x in range(wheel_x, wheel_x + 15):
						if x < OBJECT_VEHICLE_WIDTH and y < OBJECT_VEHICLE_HEIGHT:
							var dx = x - (wheel_x + 7)
							var dy = y - 60
							if dx * dx + dy * dy <= 49:
								img.set_pixel(x, y, wheel_color)

		"truck":
			# Extended cab, truck bed, larger proportions
			var body_color = Color(0.52, 0.30, 0.25, 1.0)
			var bed_color = Color(0.35, 0.35, 0.37, 1.0)
			var window_color = Color(0.50, 0.60, 0.70, 0.6)
			var wheel_color = Color(0.15, 0.15, 0.17, 1.0)

			# Cab
			for y in range(18, 62):
				for x in range(15, 60):
					img.set_pixel(x, y, body_color)

			# Cab roof
			for y in range(8, 18):
				for x in range(20, 55):
					img.set_pixel(x, y, body_color)

			# Truck bed
			for y in range(22, 60):
				for x in range(60, 113):
					img.set_pixel(x, y, bed_color)

			# Windshield
			for y in range(10, 18):
				for x in range(25, 40):
					img.set_pixel(x, y, window_color)

			# Wheels
			for wheel_x in [28, 95]:
				for y in range(50, 70):
					for x in range(wheel_x, wheel_x + 14):
						if x < OBJECT_VEHICLE_WIDTH and y < OBJECT_VEHICLE_HEIGHT:
							var dx = x - (wheel_x + 7)
							var dy = y - 60
							if dx * dx + dy * dy <= 49:
								img.set_pixel(x, y, wheel_color)

		"van":
			# Boxy profile, sliding door line, tall roof
			var body_color = Color(0.88, 0.88, 0.90, 1.0)
			var window_color = Color(0.50, 0.60, 0.70, 0.6)
			var wheel_color = Color(0.15, 0.15, 0.17, 1.0)

			# Body (tall and boxy)
			for y in range(8, 62):
				for x in range(15, 113):
					img.set_pixel(x, y, body_color)

			# Windshield
			for y in range(12, 20):
				for x in range(20, 38):
					img.set_pixel(x, y, window_color)

			# Side windows
			for y in range(14, 28):
				for x in range(45, 105):
					img.set_pixel(x, y, window_color)

			# Sliding door line
			for y in range(20, 58):
				img.set_pixel(75, y, body_color.darkened(0.3))

			# Wheels
			for wheel_x in [30, 95]:
				for y in range(52, 68):
					for x in range(wheel_x, wheel_x + 12):
						if x < OBJECT_VEHICLE_WIDTH and y < OBJECT_VEHICLE_HEIGHT:
							var dx = x - (wheel_x + 6)
							var dy = y - 60
							if dx * dx + dy * dy <= 36:
								img.set_pixel(x, y, wheel_color)

		"sports_car":
			# Low sleek profile, curved lines
			var body_color = Color(0.75, 0.25, 0.25, 1.0)
			var window_color = Color(0.40, 0.50, 0.60, 0.6)
			var wheel_color = Color(0.15, 0.15, 0.17, 1.0)

			# Body (low profile)
			for y in range(28, 62):
				for x in range(15, 113):
					img.set_pixel(x, y, body_color)

			# Low roof
			for y in range(20, 28):
				for x in range(40, 88):
					img.set_pixel(x, y, body_color)

			# Windshield
			for y in range(22, 28):
				for x in range(45, 62):
					img.set_pixel(x, y, window_color)

			# Side window
			for y in range(22, 28):
				for x in range(67, 83):
					img.set_pixel(x, y, window_color)

			# Wheels (sporty)
			for wheel_x in [28, 92]:
				for y in range(50, 68):
					for x in range(wheel_x, wheel_x + 14):
						if x < OBJECT_VEHICLE_WIDTH and y < OBJECT_VEHICLE_HEIGHT:
							var dx = x - (wheel_x + 7)
							var dy = y - 59
							if dx * dx + dy * dy <= 49:
								img.set_pixel(x, y, wheel_color)

	return ImageTexture.create_from_image(img)

func create_vehicle_shadow() -> ImageTexture:
	var img = Image.create(OBJECT_VEHICLE_WIDTH, OBJECT_VEHICLE_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(OBJECT_VEHICLE_HEIGHT):
		for x in range(OBJECT_VEHICLE_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Large shadow
	var shadow_cx = OBJECT_VEHICLE_WIDTH / 2
	var shadow_cy = OBJECT_VEHICLE_HEIGHT - 6
	var shadow_width = 100
	var shadow_height = 24

	for y in range(shadow_cy - shadow_height / 2, shadow_cy + shadow_height / 2):
		for x in range(shadow_cx - shadow_width / 2, shadow_cx + shadow_width / 2):
			if x >= 0 and x < OBJECT_VEHICLE_WIDTH and y >= 0 and y < OBJECT_VEHICLE_HEIGHT:
				var dx = float(x - shadow_cx) / (shadow_width / 2)
				var dy = float(y - shadow_cy) / (shadow_height / 2)
				var dist = sqrt(dx * dx + dy * dy)

				if dist <= 1.0:
					var alpha = 0.3 * (1.0 - dist * 0.5)
					img.set_pixel(x, y, Color(0, 0, 0, alpha))

	return ImageTexture.create_from_image(img)

func create_grass_tuft(variant: int) -> ImageTexture:
	var img = Image.create(GRASS_TUFT_WIDTH, GRASS_TUFT_HEIGHT, false, Image.FORMAT_RGBA8)

	# Clear to transparent
	for y in range(GRASS_TUFT_HEIGHT):
		for x in range(GRASS_TUFT_WIDTH):
			img.set_pixel(x, y, Color(0, 0, 0, 0))

	# Tuft center
	var tuft_cx = GRASS_TUFT_WIDTH / 2
	var tuft_bottom_y = GRASS_TUFT_HEIGHT - 2

	# Tuft colors
	var tuft_color_a = Color(0.28, 0.38, 0.20, 1.0)
	var tuft_color_b = Color(0.35, 0.45, 0.25, 1.0)
	var tuft_color_c = Color(0.42, 0.52, 0.30, 1.0)

	# 4-7 grass blades radiating from center
	var blade_count = 4 + (hash_int(variant, variant * 2) % 4)
	for i in range(blade_count):
		var blade_offset = int((hash_2d(i, variant) - 0.5) * 6.0)
		var blade_x = tuft_cx + blade_offset
		var blade_height = 8 + (hash_int(i, variant) % 8)

		# Blade color
		var color_choice = hash_2d(blade_x, i)
		var blade_color: Color
		if color_choice < 0.33:
			blade_color = tuft_color_a
		elif color_choice < 0.67:
			blade_color = tuft_color_b
		else:
			blade_color = tuft_color_c

		# Draw blade
		for h in range(blade_height):
			var lean = int((hash_2d(i, variant * 2) - 0.5) * 3.0) if h > blade_height / 2 else 0
			var blade_y = tuft_bottom_y - h
			var blade_px = blade_x + lean

			if blade_px >= 0 and blade_px < GRASS_TUFT_WIDTH and blade_y >= 0 and blade_y < GRASS_TUFT_HEIGHT:
				img.set_pixel(blade_px, blade_y, blade_color)

	return ImageTexture.create_from_image(img)

# ========== WORLD BUILDING ==========

func build_world(generator: WorldGenerator, container: Node2D, obj_container: Node2D):
	world_generator = generator
	world_node = container
	object_container = obj_container

	# Create sprite pools
	for i in range(TILE_POOL_SIZE):
		var sprite = Sprite2D.new()
		sprite.visible = false
		world_node.add_child(sprite)
		tile_sprite_pool.append(sprite)

	for i in range(OBJECT_POOL_SIZE):
		var sprite = Sprite2D.new()
		sprite.visible = false
		object_container.add_child(sprite)
		object_sprite_pool.append(sprite)

	for i in range(SHADOW_POOL_SIZE):
		var sprite = Sprite2D.new()
		sprite.visible = false
		object_container.add_child(sprite)
		shadow_sprite_pool.append(sprite)

	for i in range(GRASS_POOL_SIZE):
		var sprite = Sprite2D.new()
		sprite.visible = false
		world_node.add_child(sprite)
		grass_sprite_pool.append(sprite)

	# Build object spatial index
	_build_object_spatial_index()

	print("TileManager: World built with sprite pools")

func _build_object_spatial_index():
	object_spatial_index.clear()

	# Populate from world_generator's object lists
	for obj in world_generator.trees:
		var key = str(obj.gx) + "," + str(obj.gy)
		object_spatial_index[key] = {
			"type": "tree",
			"variant": obj.variant,
			"rotation": 0
		}

	for obj in world_generator.rocks:
		var key = str(obj.gx) + "," + str(obj.gy)
		object_spatial_index[key] = {
			"type": "rock",
			"variant": obj.variant,
			"rotation": 0
		}

	for obj in world_generator.bushes:
		var key = str(obj.gx) + "," + str(obj.gy)
		object_spatial_index[key] = {
			"type": "bush",
			"variant": obj.variant,
			"rotation": 0
		}

	for obj in world_generator.furniture:
		var key = str(obj.gx) + "," + str(obj.gy)
		object_spatial_index[key] = {
			"type": obj.furniture_type,
			"variant": 0,
			"rotation": obj.rotation
		}

	for obj in world_generator.vehicles:
		var key = str(obj.gx) + "," + str(obj.gy)
		object_spatial_index[key] = {
			"type": obj.vehicle_type,
			"variant": 0,
			"rotation": obj.rotation
		}

func set_camera_target(target: Node2D):
	camera_target = target

func _process(_delta):
	if not camera_target:
		return

	var camera_gx = _screen_to_grid_x(camera_target.position)
	var camera_gy = _screen_to_grid_y(camera_target.position)

	# Update visible area if camera moved
	if camera_gx != last_camera_gx or camera_gy != last_camera_gy:
		last_camera_gx = camera_gx
		last_camera_gy = camera_gy
		_update_visible_tiles(camera_gx, camera_gy)
		_update_visible_objects(camera_gx, camera_gy)
		_update_visible_grass(camera_gx, camera_gy)

func _update_visible_tiles(camera_gx: int, camera_gy: int):
	var new_active: Dictionary = {}

	for gy in range(camera_gy - VIEW_RADIUS, camera_gy + VIEW_RADIUS + 1):
		for gx in range(camera_gx - VIEW_RADIUS, camera_gx + VIEW_RADIUS + 1):
			var key = str(gx) + "," + str(gy)

			if active_tile_sprites.has(key):
				new_active[key] = active_tile_sprites[key]
				active_tile_sprites.erase(key)
			else:
				var tile_name = get_tile_name(gx, gy)
				if tile_textures.has(tile_name):
					var sprite = _get_tile_sprite_from_pool()
					if sprite:
						sprite.texture = tile_textures[tile_name]
						sprite.position = grid_to_screen(gx, gy, 0)
						sprite.visible = true
						new_active[key] = sprite

	# Return unused sprites to pool
	for key in active_tile_sprites:
		var sprite = active_tile_sprites[key]
		sprite.visible = false

	active_tile_sprites = new_active

func _update_visible_objects(camera_gx: int, camera_gy: int):
	var new_active_objects: Dictionary = {}
	var new_active_shadows: Dictionary = {}

	for gy in range(camera_gy - OBJECT_VIEW_RADIUS, camera_gy + OBJECT_VIEW_RADIUS + 1):
		for gx in range(camera_gx - OBJECT_VIEW_RADIUS, camera_gx + OBJECT_VIEW_RADIUS + 1):
			var key = str(gx) + "," + str(gy)

			if object_spatial_index.has(key):
				var obj_data = object_spatial_index[key]
				var obj_type = obj_data["type"]
				var variant = obj_data["variant"]
				var rotation = obj_data["rotation"]

				var obj_key = obj_type + "_" + str(variant)

				# Reuse or create object sprite
				if active_object_sprites.has(key):
					new_active_objects[key] = active_object_sprites[key]
					active_object_sprites.erase(key)
				else:
					if object_textures.has(obj_key):
						var sprite = _get_object_sprite_from_pool()
						if sprite:
							sprite.texture = object_textures[obj_key]
							sprite.position = grid_to_screen(gx, gy, 0)
							sprite.rotation_degrees = rotation
							sprite.visible = true
							new_active_objects[key] = sprite

				# Reuse or create shadow sprite
				if active_shadow_sprites.has(key):
					new_active_shadows[key] = active_shadow_sprites[key]
					active_shadow_sprites.erase(key)
				else:
					if shadow_textures.has(obj_key):
						var shadow_sprite = _get_shadow_sprite_from_pool()
						if shadow_sprite:
							shadow_sprite.texture = shadow_textures[obj_key]
							shadow_sprite.position = grid_to_screen(gx, gy, 0)
							shadow_sprite.rotation_degrees = rotation
							shadow_sprite.visible = true
							new_active_shadows[key] = shadow_sprite

	# Return unused sprites to pool
	for key in active_object_sprites:
		active_object_sprites[key].visible = false
	for key in active_shadow_sprites:
		active_shadow_sprites[key].visible = false

	active_object_sprites = new_active_objects
	active_shadow_sprites = new_active_shadows

func _update_visible_grass(camera_gx: int, camera_gy: int):
	var new_active: Dictionary = {}

	for gy in range(camera_gy - VIEW_RADIUS, camera_gy + VIEW_RADIUS + 1):
		for gx in range(camera_gx - VIEW_RADIUS, camera_gx + VIEW_RADIUS + 1):
			var tile_name = get_tile_name(gx, gy)

			# Only grass tiles get grass tufts
			if tile_name.begins_with("grass_"):
				var tuft_count = 2 + (hash_int(gx, gy) % 3)  # 2-4 tufts per tile

				for i in range(tuft_count):
					var key = str(gx) + "," + str(gy) + "," + str(i)

					if active_grass_sprites.has(key):
						new_active[key] = active_grass_sprites[key]
						active_grass_sprites.erase(key)
					else:
						var sprite = _get_grass_sprite_from_pool()
						if sprite:
							var tuft_variant = hash_int(gx * 7 + i, gy * 11) % grass_tuft_textures.size()
							sprite.texture = grass_tuft_textures[tuft_variant]

							# Random position within tile
							var offset_x = (hash_2d(gx + i, gy) - 0.5) * 50.0
							var offset_y = (hash_2d(gy + i, gx) - 0.5) * 25.0
							sprite.position = grid_to_screen(gx, gy, 0) + Vector2(offset_x, offset_y)
							sprite.visible = true
							new_active[key] = sprite

	# Return unused sprites to pool
	for key in active_grass_sprites:
		active_grass_sprites[key].visible = false

	active_grass_sprites = new_active

func _get_tile_sprite_from_pool() -> Sprite2D:
	for sprite in tile_sprite_pool:
		if not sprite.visible:
			return sprite
	return null

func _get_object_sprite_from_pool() -> Sprite2D:
	for sprite in object_sprite_pool:
		if not sprite.visible:
			return sprite
	return null

func _get_shadow_sprite_from_pool() -> Sprite2D:
	for sprite in shadow_sprite_pool:
		if not sprite.visible:
			return sprite
	return null

func _get_grass_sprite_from_pool() -> Sprite2D:
	for sprite in grass_sprite_pool:
		if not sprite.visible:
			return sprite
	return null

# ========== COORDINATE CONVERSION (UPDATED FOR 128x64 TILES) ==========

func grid_to_screen(gx: int, gy: int, elevation: float) -> Vector2:
	var screen_x = (gx - gy) * 64  # TILE_WIDTH / 2
	var screen_y = (gx + gy) * 32  # TILE_HEIGHT / 2
	screen_y -= elevation * 16.0  # More pronounced elevation
	return Vector2(screen_x, screen_y)

func _screen_to_grid_x(screen_pos: Vector2) -> int:
	var sx = screen_pos.x
	var sy = screen_pos.y
	var gx = (sx / 64 + sy / 32) / 2
	return int(gx)

func _screen_to_grid_y(screen_pos: Vector2) -> int:
	var sx = screen_pos.x
	var sy = screen_pos.y
	var gy = (sy / 32 - sx / 64) / 2
	return int(gy)

# ========== TILE NAME LOOKUP ==========

func get_tile_name(gx: int, gy: int) -> String:
	var noise_val = world_generator.noise.get_noise_2d(float(gx), float(gy))
	var moisture = world_generator.moisture_noise.get_noise_2d(float(gx) * 0.5, float(gy) * 0.5)

	# Determine biome
	if noise_val < -0.3:
		var variant = abs(hash_int(gx, gy)) % 3
		return "water_" + str(variant)
	elif noise_val < -0.1:
		var variant = abs(hash_int(gx, gy)) % 2
		return "sand_" + str(variant)
	elif noise_val > 0.5:
		var variant = abs(hash_int(gx, gy)) % 3
		return "stone_" + str(variant)
	elif moisture < -0.2:
		var variant = abs(hash_int(gx, gy)) % 4
		return "dirt_" + str(variant)
	else:
		var variant = abs(hash_int(gx, gy)) % 6
		return "grass_" + str(variant)

# ========== HASH FUNCTIONS ==========

func hash_int(x: int, y: int) -> int:
	var h = x * 374761393 + y * 668265263
	h = (h ^ (h >> 13)) * 1274126177
	return h ^ (h >> 16)

func hash_2d(x, y) -> float:
	var ix = int(x * 1000)
	var iy = int(y * 1000)
	var h = hash_int(ix, iy)
	return float(abs(h) % 1000) / 1000.0
