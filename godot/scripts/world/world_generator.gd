class_name WorldGenerator
extends Node

const WORLD_SIZE = 256
const BIOME_WATER = 0
const BIOME_MEADOW = 1
const BIOME_FOREST = 2
const BIOME_DENSE_FOREST = 3
const BIOME_MOUNTAIN = 4

# Generated data
var tiles: PackedInt32Array
var biomes: PackedInt32Array
var elevation: PackedFloat32Array
var moisture: PackedFloat32Array
var walkability: PackedByteArray
var objects: Array = []  # {type, gx, gy, variant}
var buildings: Array = []  # {type, gx, gy, width, height, rotation}
var roads: Array = []  # {gx, gy}
var vehicles: Array = []  # {type, gx, gy, rotation}

# Noise generators
var noise_terrain: FastNoiseLite
var noise_moisture: FastNoiseLite
var noise_detail: FastNoiseLite

# Building templates (width, height, type)
var building_templates = [
	{"w": 4, "h": 3, "type": "house_small"},
	{"w": 5, "h": 4, "type": "house_medium"},
	{"w": 6, "h": 5, "type": "house_large"},
	{"w": 8, "h": 6, "type": "house_mansion"},
	{"w": 3, "h": 3, "type": "shed"},
	{"w": 10, "h": 8, "type": "warehouse"},
	{"w": 6, "h": 6, "type": "store"},
	{"w": 7, "h": 5, "type": "restaurant"},
	{"w": 5, "h": 5, "type": "garage"},
	{"w": 4, "h": 4, "type": "workshop"},
	{"w": 12, "h": 10, "type": "school"},
	{"w": 8, "h": 8, "type": "office"},
	{"w": 6, "h": 4, "type": "clinic"},
	{"w": 9, "h": 7, "type": "supermarket"},
	{"w": 4, "h": 6, "type": "apartment"},
	{"w": 5, "h": 3, "type": "gas_station"},
	{"w": 7, "h": 6, "type": "church"},
	{"w": 10, "h": 9, "type": "mall"},
	{"w": 6, "h": 5, "type": "library"},
	{"w": 5, "h": 4, "type": "bank"},
	{"w": 8, "h": 5, "type": "hotel"},
	{"w": 4, "h": 4, "type": "bakery"},
	{"w": 5, "h": 5, "type": "cafe"},
]

func generate(seed_val: int):
	print("WorldGenerator: Starting generation with seed ", seed_val)
	var start_time = Time.get_ticks_msec()

	# Initialize noise
	noise_terrain = FastNoiseLite.new()
	noise_terrain.seed = seed_val
	noise_terrain.noise_type = FastNoiseLite.TYPE_PERLIN
	noise_terrain.frequency = 0.02
	noise_terrain.fractal_octaves = 4

	noise_moisture = FastNoiseLite.new()
	noise_moisture.seed = seed_val + 1000
	noise_moisture.noise_type = FastNoiseLite.TYPE_CELLULAR
	noise_moisture.frequency = 0.03

	noise_detail = FastNoiseLite.new()
	noise_detail.seed = seed_val + 2000
	noise_detail.noise_type = FastNoiseLite.TYPE_SIMPLEX
	noise_detail.frequency = 0.1

	# Allocate arrays
	var total = WORLD_SIZE * WORLD_SIZE
	tiles.resize(total)
	biomes.resize(total)
	elevation.resize(total)
	moisture.resize(total)
	walkability.resize(total)

	# Generate terrain
	generate_terrain()

	# Smooth elevation
	smooth_elevation()
	smooth_elevation()  # Second pass

	# Assign biomes
	assign_biomes()

	# Generate roads
	generate_roads()

	# Place buildings
	place_buildings()

	# Place furniture inside buildings
	place_furniture()

	# Place natural objects (trees, rocks, bushes)
	place_objects()

	# Spawn vehicles
	spawn_vehicles()

	var elapsed = Time.get_ticks_msec() - start_time
	print("WorldGenerator: Complete in ", elapsed, "ms")
	print("  - Objects: ", objects.size())
	print("  - Buildings: ", buildings.size())
	print("  - Roads: ", roads.size())
	print("  - Vehicles: ", vehicles.size())

func generate_terrain():
	for y in range(WORLD_SIZE):
		for x in range(WORLD_SIZE):
			var idx = y * WORLD_SIZE + x
			var elev = noise_terrain.get_noise_2d(x, y)
			var moist = noise_moisture.get_noise_2d(x, y) * 0.5 + 0.5

			elevation[idx] = elev
			moisture[idx] = moist
			walkability[idx] = 1  # Default walkable

func smooth_elevation():
	var new_elev = elevation.duplicate()
	for y in range(1, WORLD_SIZE - 1):
		for x in range(1, WORLD_SIZE - 1):
			var idx = y * WORLD_SIZE + x
			var sum = elevation[idx]
			var count = 1.0

			# Average with neighbors
			for dy in [-1, 0, 1]:
				for dx in [-1, 0, 1]:
					if dx == 0 and dy == 0:
						continue
					var nx = x + dx
					var ny = y + dy
					var nidx = ny * WORLD_SIZE + nx
					sum += elevation[nidx]
					count += 1.0

			new_elev[idx] = sum / count

	elevation = new_elev

func assign_biomes():
	for y in range(WORLD_SIZE):
		for x in range(WORLD_SIZE):
			var idx = y * WORLD_SIZE + x
			var elev = elevation[idx]
			var moist = moisture[idx]

			var biome = BIOME_MEADOW

			if elev < -0.2:
				biome = BIOME_WATER
				walkability[idx] = 0
			elif elev > 0.5:
				biome = BIOME_MOUNTAIN
				walkability[idx] = 0
			elif moist > 0.6 and elev > 0.0:
				biome = BIOME_DENSE_FOREST
			elif moist > 0.4 and elev > -0.1:
				biome = BIOME_FOREST
			else:
				biome = BIOME_MEADOW

			biomes[idx] = biome

			# Assign tile type based on biome
			match biome:
				BIOME_WATER:
					tiles[idx] = randi() % 3  # water variants
				BIOME_MOUNTAIN:
					tiles[idx] = 10 + randi() % 2  # stone variants
				BIOME_DENSE_FOREST, BIOME_FOREST:
					tiles[idx] = 3 + randi() % 3  # grass variants
				BIOME_MEADOW:
					tiles[idx] = 3 + randi() % 3  # grass variants

func generate_roads():
	# Generate 3-4 bezier curve roads from spawn (128,128) to distant points
	var spawn_x = 128
	var spawn_y = 128
	var num_roads = 3 + randi() % 2

	for i in range(num_roads):
		var angle = randf() * TAU
		var distance = 80 + randf() * 60
		var end_x = int(spawn_x + cos(angle) * distance)
		var end_y = int(spawn_y + sin(angle) * distance)

		# Clamp to world bounds
		end_x = clamp(end_x, 10, WORLD_SIZE - 10)
		end_y = clamp(end_y, 10, WORLD_SIZE - 10)

		# Generate bezier curve
		var control1_x = spawn_x + (end_x - spawn_x) * 0.33 + randf_range(-20, 20)
		var control1_y = spawn_y + (end_y - spawn_y) * 0.33 + randf_range(-20, 20)
		var control2_x = spawn_x + (end_x - spawn_x) * 0.66 + randf_range(-20, 20)
		var control2_y = spawn_y + (end_y - spawn_y) * 0.66 + randf_range(-20, 20)

		# Sample points along bezier
		for t_step in range(101):
			var t = t_step / 100.0
			var inv_t = 1.0 - t
			var gx = int(
				inv_t * inv_t * inv_t * spawn_x +
				3 * inv_t * inv_t * t * control1_x +
				3 * inv_t * t * t * control2_x +
				t * t * t * end_x
			)
			var gy = int(
				inv_t * inv_t * inv_t * spawn_y +
				3 * inv_t * inv_t * t * control1_y +
				3 * inv_t * t * t * control2_y +
				t * t * t * end_y
			)

			if gx >= 0 and gy >= 0 and gx < WORLD_SIZE and gy < WORLD_SIZE:
				var idx = gy * WORLD_SIZE + gx
				tiles[idx] = 20  # Road tile
				walkability[idx] = 1
				roads.append({"gx": gx, "gy": gy})

				# Widen road (3 tiles wide)
				for offset in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
					var nx = gx + offset.x
					var ny = gy + offset.y
					if nx >= 0 and ny >= 0 and nx < WORLD_SIZE and ny < WORLD_SIZE:
						var nidx = ny * WORLD_SIZE + nx
						if biomes[nidx] != BIOME_WATER and biomes[nidx] != BIOME_MOUNTAIN:
							tiles[nidx] = 20
							walkability[nidx] = 1
							roads.append({"gx": nx, "gy": ny})

func place_buildings():
	var num_buildings = 40 + randi() % 21  # 40-60
	var attempts = 0
	var max_attempts = num_buildings * 20

	while buildings.size() < num_buildings and attempts < max_attempts:
		attempts += 1

		var template = building_templates[randi() % building_templates.size()]
		var gx = 20 + randi() % (WORLD_SIZE - 40)
		var gy = 20 + randi() % (WORLD_SIZE - 40)

		# Check if area is clear
		if can_place_building(gx, gy, template.w, template.h):
			buildings.append({
				"type": template.type,
				"gx": gx,
				"gy": gy,
				"width": template.w,
				"height": template.h,
				"rotation": 0
			})

			# Mark area as non-walkable (except doors)
			for dy in range(template.h):
				for dx in range(template.w):
					var tx = gx + dx
					var ty = gy + dy
					if tx >= 0 and ty >= 0 and tx < WORLD_SIZE and ty < WORLD_SIZE:
						var idx = ty * WORLD_SIZE + tx
						tiles[idx] = 30  # Floor tile
						# Walls are non-walkable
						if dx == 0 or dy == 0 or dx == template.w - 1 or dy == template.h - 1:
							walkability[idx] = 0
						else:
							walkability[idx] = 1

			# Add door (south side, center)
			var door_x = gx + template.w / 2
			var door_y = gy + template.h - 1
			if door_x >= 0 and door_y >= 0 and door_x < WORLD_SIZE and door_y < WORLD_SIZE:
				var door_idx = door_y * WORLD_SIZE + door_x
				walkability[door_idx] = 1
				objects.append({"type": "door", "gx": door_x, "gy": door_y, "variant": 0})

func can_place_building(gx: int, gy: int, w: int, h: int) -> bool:
	for dy in range(-2, h + 2):
		for dx in range(-2, w + 2):
			var tx = gx + dx
			var ty = gy + dy
			if tx < 0 or ty < 0 or tx >= WORLD_SIZE or ty >= WORLD_SIZE:
				return false
			var idx = ty * WORLD_SIZE + tx
			# Check for water, mountain, existing buildings
			if biomes[idx] == BIOME_WATER or biomes[idx] == BIOME_MOUNTAIN:
				return false
			if tiles[idx] >= 30:  # Floor tiles = building
				return false
	return true

func place_furniture():
	for building in buildings:
		var gx = building.gx
		var gy = building.gy
		var w = building.width
		var h = building.height

		# Place furniture inside (not on walls)
		var furniture_types = ["bed", "table", "chair", "sink", "oven", "fridge", "couch", "dresser"]
		var num_furniture = 3 + randi() % 5

		for i in range(num_furniture):
			var fx = gx + 1 + randi() % max(1, w - 2)
			var fy = gy + 1 + randi() % max(1, h - 2)
			var ftype = furniture_types[randi() % furniture_types.size()]
			objects.append({"type": ftype, "gx": fx, "gy": fy, "variant": 0})

func place_objects():
	for y in range(WORLD_SIZE):
		for x in range(WORLD_SIZE):
			var idx = y * WORLD_SIZE + x
			var biome = biomes[idx]

			# Skip water, mountain, roads, buildings
			if biome == BIOME_WATER or biome == BIOME_MOUNTAIN:
				continue
			if tiles[idx] >= 20:  # Road or floor
				continue

			# Tree placement (DENSE - reduced spacing)
			var tree_chance = 0.0
			match biome:
				BIOME_DENSE_FOREST:
					tree_chance = 0.55  # 55% chance per tile
				BIOME_FOREST:
					tree_chance = 0.45  # 45% chance
				BIOME_MEADOW:
					tree_chance = 0.08  # 8% chance

			if randf() < tree_chance:
				# Check minimum spacing (reduced to 1 tile for density)
				if check_spacing(x, y, 1, "tree"):
					objects.append({"type": "tree", "gx": x, "gy": y, "variant": randi() % 4})
					walkability[idx] = 0

			# Rock placement
			var rock_chance = 0.0
			match biome:
				BIOME_DENSE_FOREST:
					rock_chance = 0.05
				BIOME_FOREST:
					rock_chance = 0.08
				BIOME_MEADOW:
					rock_chance = 0.12

			if randf() < rock_chance:
				if check_spacing(x, y, 2, "rock"):
					objects.append({"type": "rock", "gx": x, "gy": y, "variant": randi() % 2})
					walkability[idx] = 0

			# Bush placement
			var bush_chance = 0.0
			match biome:
				BIOME_DENSE_FOREST:
					bush_chance = 0.35
				BIOME_FOREST:
					bush_chance = 0.25
				BIOME_MEADOW:
					bush_chance = 0.15

			if randf() < bush_chance:
				if check_spacing(x, y, 1, "bush"):
					objects.append({"type": "bush", "gx": x, "gy": y, "variant": randi() % 2})

func check_spacing(gx: int, gy: int, min_dist: int, obj_type: String) -> bool:
	for obj in objects:
		if obj.type == obj_type:
			var dx = abs(obj.gx - gx)
			var dy = abs(obj.gy - gy)
			if dx < min_dist and dy < min_dist:
				return false
	return true

func spawn_vehicles():
	var num_vehicles = 15 + randi() % 11  # 15-25 vehicles
	var vehicle_types = ["sedan", "suv", "truck", "van", "sports_car"]

	for i in range(num_vehicles):
		# Spawn near roads
		if roads.size() == 0:
			break

		var road_tile = roads[randi() % roads.size()]
		var gx = road_tile.gx + randi_range(-2, 2)
		var gy = road_tile.gy + randi_range(-2, 2)

		if gx >= 0 and gy >= 0 and gx < WORLD_SIZE and gy < WORLD_SIZE:
			var idx = gy * WORLD_SIZE + gx
			if walkability[idx] == 1:
				var vtype = vehicle_types[randi() % vehicle_types.size()]
				var rotation = randi() % 4  # 0=N, 1=E, 2=S, 3=W
				vehicles.append({"type": vtype, "gx": gx, "gy": gy, "rotation": rotation})
				walkability[idx] = 0  # Block tile

func get_tile(gx: int, gy: int) -> int:
	if gx < 0 or gy < 0 or gx >= WORLD_SIZE or gy >= WORLD_SIZE:
		return 0
	return tiles[gy * WORLD_SIZE + gx]

func get_biome(gx: int, gy: int) -> int:
	if gx < 0 or gy < 0 or gx >= WORLD_SIZE or gy >= WORLD_SIZE:
		return BIOME_MEADOW
	return biomes[gy * WORLD_SIZE + gx]

func get_elevation(gx: int, gy: int) -> float:
	if gx < 0 or gy < 0 or gx >= WORLD_SIZE or gy >= WORLD_SIZE:
		return 0.0
	return elevation[gy * WORLD_SIZE + gx]

func is_walkable(gx: int, gy: int) -> bool:
	if gx < 0 or gy < 0 or gx >= WORLD_SIZE or gy >= WORLD_SIZE:
		return false
	return walkability[gy * WORLD_SIZE + gx] == 1
