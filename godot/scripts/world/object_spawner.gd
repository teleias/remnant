class_name ObjectSpawner
extends Node2D

# Spawning configuration
const MIN_SPAWN_DISTANCE: float = 20.0 * 64  # 20 tiles in pixels (half TILE_WIDTH)
const MAX_SPAWN_DISTANCE: float = 40.0 * 64  # 40 tiles in pixels
const DESPAWN_DISTANCE: float = 50.0 * 64    # 50 tiles in pixels
const MAX_ACTIVE_ANIMALS: int = 40
const SPAWN_INTERVAL: float = 8.0
const TILE_SIZE: int = 64  # Half of TILE_WIDTH (128) for grid spacing

# Animal scene preload
var animal_scene: PackedScene = preload("res://scenes/animals/animal.tscn")

# Active animals
var active_animals: Array = []
var spawn_timer: float = 0.0

# World objects
var world_objects: Dictionary = {}  # position -> object node
var active_objects: Array = []
var object_pool: Dictionary = {}  # type -> Array of pooled nodes

# Biome-based spawn weights
var biome_spawn_tables: Dictionary = {
	0: {  # Grassland
		"deer": 30,
		"rabbit": 25,
		"squirrel": 20,
		"elk": 10,
		"coyote": 10,
		"wolf": 5
	},
	1: {  # Forest
		"deer": 25,
		"rabbit": 20,
		"squirrel": 20,
		"wolf": 15,
		"bear": 10,
		"cougar": 10
	},
	2: {  # Mountain
		"elk": 30,
		"cougar": 20,
		"bear": 20,
		"wolf": 15,
		"deer": 10,
		"rabbit": 5
	},
	3: {  # Water
		"deer": 40,
		"rabbit": 30,
		"squirrel": 15,
		"elk": 10,
		"coyote": 5
	}
}

# Group sizes
var group_sizes: Dictionary = {
	"deer": [2, 5],
	"elk": [3, 8],
	"rabbit": [1, 2],
	"squirrel": [1, 1],
	"wolf": [3, 5],
	"bear": [1, 1],
	"cougar": [1, 1],
	"coyote": [1, 3]
}

# References
var player: CharacterBody2D
var world_generator: Node
var game_state: Node

func _ready() -> void:
	# Find references
	await get_tree().process_frame
	player = get_tree().get_first_node_in_group("player")
	world_generator = get_node_or_null("/root/Game/WorldGenerator")
	game_state = get_node("/root/GameState")

	# Initialize object pool
	initialize_object_pool()

func _process(delta: float) -> void:
	if not player:
		return

	spawn_timer += delta

	# Spawn animals periodically
	if spawn_timer >= SPAWN_INTERVAL:
		spawn_timer = 0.0
		attempt_animal_spawn()

	# Update active animals (despawn if too far)
	update_active_animals()

	# Update world objects (activate/deactivate based on camera)
	update_world_objects()

func attempt_animal_spawn() -> void:
	if active_animals.size() >= MAX_ACTIVE_ANIMALS:
		return

	# Determine spawn position (ring around player)
	var spawn_pos = get_random_spawn_position()
	if spawn_pos == Vector2.ZERO:
		return

	# Get biome at spawn position
	var biome = get_biome_at_position(spawn_pos)
	if biome == -1:
		return

	# Select animal type based on biome
	var animal_type = select_animal_type(biome)
	if animal_type == "":
		return

	# Determine group size
	var group_size_range = group_sizes.get(animal_type, [1, 1])
	var group_size = randi_range(group_size_range[0], group_size_range[1])

	# Spawn group
	spawn_animal_group(animal_type, spawn_pos, group_size)

func get_random_spawn_position() -> Vector2:
	if not player:
		return Vector2.ZERO

	# Random angle
	var angle = randf() * TAU

	# Random distance in ring
	var distance = randf_range(MIN_SPAWN_DISTANCE, MAX_SPAWN_DISTANCE)

	# Calculate position
	var offset = Vector2(cos(angle), sin(angle)) * distance
	var spawn_pos = player.global_position + offset

	# Snap to tile grid
	spawn_pos = Vector2(
		floor(spawn_pos.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2,
		floor(spawn_pos.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
	)

	return spawn_pos

func get_biome_at_position(pos: Vector2) -> int:
	if not world_generator:
		return 0  # Default to grassland

	var tile_x = int(floor(pos.x / TILE_SIZE))
	var tile_y = int(floor(pos.y / TILE_SIZE))

	# Call world generator to get biome
	if world_generator.has_method("get_biome_at"):
		return world_generator.get_biome_at(tile_x, tile_y)

	return 0

func select_animal_type(biome: int) -> String:
	if biome not in biome_spawn_tables:
		biome = 0

	var spawn_table = biome_spawn_tables[biome]
	var total_weight = 0

	for weight in spawn_table.values():
		total_weight += weight

	var roll = randi() % total_weight
	var current_weight = 0

	for animal_type in spawn_table.keys():
		current_weight += spawn_table[animal_type]
		if roll < current_weight:
			return animal_type

	return ""

func spawn_animal_group(animal_type: String, center_pos: Vector2, group_size: int) -> void:
	var group_members: Array = []

	for i in range(group_size):
		# Offset from center for group spread
		var offset = Vector2.ZERO
		if i > 0:
			var angle = (float(i) / float(group_size)) * TAU
			var distance = randf_range(TILE_SIZE, TILE_SIZE * 3)
			offset = Vector2(cos(angle), sin(angle)) * distance

		var spawn_pos = center_pos + offset

		# Create animal
		var animal = animal_scene.instantiate()
		animal.animal_type = animal_type
		animal.global_position = spawn_pos

		# Add to scene
		add_child(animal)
		active_animals.append(animal)
		group_members.append(animal)

		# Connect signals
		animal.animal_died.connect(_on_animal_died)
		animal.animal_attacked_player.connect(_on_animal_attacked_player)

	# Set pack members for predators
	if animal_type in ["wolf", "coyote"]:
		for animal in group_members:
			animal.set_pack_members(group_members)

func update_active_animals() -> void:
	if not player:
		return

	var to_remove: Array = []

	for animal in active_animals:
		if not is_instance_valid(animal):
			to_remove.append(animal)
			continue

		var distance = animal.global_position.distance_to(player.global_position)

		# Despawn if too far and not in combat
		if distance > DESPAWN_DISTANCE:
			if animal.state not in ["attack", "charge", "stalk"]:
				to_remove.append(animal)
				animal.queue_free()

	# Remove from active list
	for animal in to_remove:
		active_animals.erase(animal)

func _on_animal_died(animal: AnimalAI) -> void:
	# Animal can now be harvested
	pass

func _on_animal_attacked_player(damage: int, source: String) -> void:
	# Forward to player's combat system
	if player and player.has_node("CombatSystem"):
		var combat_system = player.get_node("CombatSystem")
		combat_system.take_damage(damage, source)

# World object management
func initialize_object_pool() -> void:
	# Initialize pools for different object types
	object_pool = {
		"tree": [],
		"rock": [],
		"bush": [],
		"grass": []
	}

func spawn_world_object(object_type: String, pos: Vector2) -> Node2D:
	var obj: Node2D = null

	# Try to get from pool
	if object_type in object_pool and object_pool[object_type].size() > 0:
		obj = object_pool[object_type].pop_back()
		obj.global_position = pos
		obj.visible = true
	else:
		# Create new object
		obj = create_world_object(object_type)
		obj.global_position = pos

	# Track object
	var key = pos_to_key(pos)
	world_objects[key] = obj

	return obj

func create_world_object(object_type: String) -> Node2D:
	# Create simple placeholder visual
	var obj = Node2D.new()
	obj.y_sort_enabled = true

	var sprite = Sprite2D.new()
	obj.add_child(sprite)

	# Set placeholder colors
	match object_type:
		"tree":
			sprite.modulate = Color(0.2, 0.5, 0.2)
		"rock":
			sprite.modulate = Color(0.5, 0.5, 0.5)
		"bush":
			sprite.modulate = Color(0.3, 0.6, 0.3)
		"grass":
			sprite.modulate = Color(0.4, 0.7, 0.4)

	# Add metadata
	obj.set_meta("object_type", object_type)
	obj.set_meta("can_gather", true)

	add_child(obj)
	return obj

func return_object_to_pool(obj: Node2D) -> void:
	if not is_instance_valid(obj):
		return

	var object_type = obj.get_meta("object_type", "")
	if object_type == "":
		obj.queue_free()
		return

	obj.visible = false

	if object_type in object_pool:
		object_pool[object_type].append(obj)
	else:
		obj.queue_free()

func update_world_objects() -> void:
	if not player:
		return

	# Simple viewport-based activation
	var camera = get_viewport().get_camera_2d()
	if not camera:
		return

	var viewport_rect = get_viewport_rect()
	var camera_pos = camera.global_position
	var half_size = viewport_rect.size / 2

	var visible_rect = Rect2(
		camera_pos - half_size * 1.5,  # Extra buffer
		viewport_rect.size * 1.5
	)

	# Update object visibility
	for key in world_objects.keys():
		var obj = world_objects[key]
		if is_instance_valid(obj):
			obj.visible = visible_rect.has_point(obj.global_position)

func pos_to_key(pos: Vector2) -> String:
	var tile_x = int(floor(pos.x / TILE_SIZE))
	var tile_y = int(floor(pos.y / TILE_SIZE))
	return str(tile_x) + "," + str(tile_y)

func add_world_object_from_generation(object_type: String, pos: Vector2) -> void:
	# Called by world generator to register objects
	var key = pos_to_key(pos)
	if key in world_objects:
		return  # Already exists

	spawn_world_object(object_type, pos)

func remove_world_object(pos: Vector2) -> void:
	var key = pos_to_key(pos)
	if key in world_objects:
		var obj = world_objects[key]
		return_object_to_pool(obj)
		world_objects.erase(key)

func clear_all_objects() -> void:
	# Clear animals
	for animal in active_animals:
		if is_instance_valid(animal):
			animal.queue_free()
	active_animals.clear()

	# Clear world objects
	for obj in world_objects.values():
		if is_instance_valid(obj):
			obj.queue_free()
	world_objects.clear()
