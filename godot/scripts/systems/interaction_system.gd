extends Node

signal gather_started(object_type: String, duration: float)
signal gather_completed(object_type: String, items: Array)
signal gather_cancelled()
signal interaction_available(object: Node, interaction_type: String)

const INTERACTION_RANGE = 1.5 * 64 # 1.5 tiles

var inventory_system: Node
var skill_system: Node

var is_gathering: bool = false
var gather_timer: float = 0.0
var gather_duration: float = 0.0
var current_object: Node = null
var current_object_type: String = ""

func _ready():
	pass

func _process(delta):
	if is_gathering:
		gather_timer += delta
		if gather_timer >= gather_duration:
			_complete_gather()

	# Check for nearby interactables
	_check_nearby_interactables()

func initialize(inv_system: Node, skills_system: Node):
	inventory_system = inv_system
	skill_system = skills_system

func try_interact(player_pos: Vector2) -> bool:
	if is_gathering:
		return false

	var nearest = _find_nearest_interactable(player_pos)
	if nearest == null:
		return false

	var object = nearest.object
	var object_type = nearest.type

	match object_type:
		"tree":
			_start_gather_tree(object)
		"rock":
			_start_gather_rock(object)
		"bush":
			_start_gather_bush(object)
		"water":
			_start_gather_water(object)
		"carcass":
			_start_gather_carcass(object)
		"container":
			_open_container(object)
		"door":
			_toggle_door(object)

	return true

func cancel_interaction():
	if is_gathering:
		is_gathering = false
		gather_timer = 0.0
		current_object = null
		current_object_type = ""
		gather_cancelled.emit()

# ===== GATHERING =====

func _start_gather_tree(tree: Node):
	var tool_power = _get_tool_power("axe")
	if tool_power == 0:
		tool_power = 1 # Can gather with hands, just slow

	var base_time = 4.0
	var duration = base_time / tool_power

	is_gathering = true
	gather_timer = 0.0
	gather_duration = duration
	current_object = tree
	current_object_type = "tree"

	gather_started.emit("tree", duration)

func _start_gather_rock(rock: Node):
	var tool_power = _get_tool_power("pickaxe")
	if tool_power == 0:
		# Cannot gather rock without pickaxe
		return

	var base_time = 5.0
	var duration = base_time / tool_power

	is_gathering = true
	gather_timer = 0.0
	gather_duration = duration
	current_object = rock
	current_object_type = "rock"

	gather_started.emit("rock", duration)

func _start_gather_bush(bush: Node):
	var base_time = 1.5

	is_gathering = true
	gather_timer = 0.0
	gather_duration = base_time
	current_object = bush
	current_object_type = "bush"

	gather_started.emit("bush", base_time)

func _start_gather_water(water_source: Node):
	# Need container
	if not inventory_system.has_item("pot", 1):
		return

	var base_time = 1.5

	is_gathering = true
	gather_timer = 0.0
	gather_duration = base_time
	current_object = water_source
	current_object_type = "water"

	gather_started.emit("water", base_time)

func _start_gather_carcass(carcass: Node):
	var tool_power = _get_tool_power("knife")
	if tool_power == 0:
		# Need knife to butcher
		return

	var base_time = 3.0

	is_gathering = true
	gather_timer = 0.0
	gather_duration = base_time
	current_object = carcass
	current_object_type = "carcass"

	gather_started.emit("carcass", base_time)

func _complete_gather():
	is_gathering = false
	gather_timer = 0.0

	var items_gathered = []

	match current_object_type:
		"tree":
			items_gathered = _gather_tree_items()
			skill_system.add_xp("foraging", 5)
		"rock":
			items_gathered = _gather_rock_items()
			skill_system.add_xp("mining", 5)
		"bush":
			items_gathered = _gather_bush_items()
			skill_system.add_xp("foraging", 3)
		"water":
			items_gathered = _gather_water_items()
			skill_system.add_xp("survival", 2)
		"carcass":
			items_gathered = _gather_carcass_items()
			skill_system.add_xp("survival", 8)

	# Add items to inventory
	for item in items_gathered:
		inventory_system.add_item(item.id, item.qty)

	# Remove object from world
	if current_object != null and current_object.has_method("on_gathered"):
		current_object.on_gathered()
	elif current_object != null:
		current_object.queue_free()

	gather_completed.emit(current_object_type, items_gathered)

	current_object = null
	current_object_type = ""

func _gather_tree_items() -> Array:
	var items = []
	items.append({"id": "wood_log", "qty": randi_range(1, 2)})
	items.append({"id": "stick", "qty": randi_range(2, 4)})

	if randf() < 0.3:
		items.append({"id": "fiber", "qty": randi_range(1, 3)})

	return items

func _gather_rock_items() -> Array:
	var items = []
	items.append({"id": "stone", "qty": randi_range(1, 3)})

	if randf() < 0.4:
		items.append({"id": "flint", "qty": randi_range(1, 2)})

	return items

func _gather_bush_items() -> Array:
	var items = []

	# Random between berries, herbs, fiber
	var roll = randf()
	if roll < 0.5:
		items.append({"id": "berries", "qty": randi_range(2, 5)})
	elif roll < 0.8:
		items.append({"id": "herbs", "qty": randi_range(1, 3)})
	else:
		items.append({"id": "fiber", "qty": randi_range(2, 4)})

	return items

func _gather_water_items() -> Array:
	var items = []
	items.append({"id": "water_dirty", "qty": 1})
	return items

func _gather_carcass_items() -> Array:
	var items = []

	# Get animal type from carcass
	var animal_type = "default"
	if current_object.has("animal_type"):
		animal_type = current_object.animal_type

	match animal_type:
		"deer":
			items.append({"id": "raw_venison", "qty": randi_range(2, 4)})
			items.append({"id": "pelt_deer", "qty": 1})
			items.append({"id": "fat", "qty": randi_range(1, 2)})
		"wolf":
			items.append({"id": "raw_meat", "qty": randi_range(1, 3)})
			items.append({"id": "pelt_wolf", "qty": 1})
			items.append({"id": "fat", "qty": 1})
		"bear":
			items.append({"id": "raw_meat", "qty": randi_range(4, 6)})
			items.append({"id": "pelt_bear", "qty": 1})
			items.append({"id": "fat", "qty": randi_range(2, 3)})
		"rabbit":
			items.append({"id": "raw_rabbit", "qty": 1})
			items.append({"id": "pelt_deer", "qty": 1}) # Use deer pelt as generic
		"bird":
			items.append({"id": "raw_meat", "qty": 1})
			items.append({"id": "feathers", "qty": randi_range(3, 6)})
		_:
			items.append({"id": "raw_meat", "qty": randi_range(1, 2)})

	return items

# ===== CONTAINERS =====

func _open_container(container: Node):
	# Emit signal to UI to show container contents
	# The UI will handle displaying loot
	if container.has_method("get_loot"):
		var loot = container.get_loot()
		# Signal to open loot UI (handled by player/UI)
		var player = get_parent()
		if player.has_signal("container_opened"):
			player.emit_signal("container_opened", container, loot)

# ===== DOORS =====

func _toggle_door(door: Node):
	if door.has_method("toggle"):
		door.toggle()

# ===== UTILITY =====

func _get_tool_power(tool_type: String) -> int:
	var equipped_tool = inventory_system.get_equipped_item("hands")

	if equipped_tool.is_empty():
		return 0

	if equipped_tool.get("tool_type", "") == tool_type:
		return equipped_tool.get("tool_power", 1)

	return 0

func _find_nearest_interactable(player_pos: Vector2) -> Dictionary:
	var nearest = null
	var nearest_distance = INTERACTION_RANGE + 1

	# Get all interactable objects
	var interactables = get_tree().get_nodes_in_group("interactable")

	for obj in interactables:
		var distance = player_pos.distance_to(obj.global_position)
		if distance <= INTERACTION_RANGE and distance < nearest_distance:
			nearest = obj
			nearest_distance = distance

	if nearest != null:
		var object_type = _get_object_type(nearest)
		return {"object": nearest, "type": object_type, "distance": nearest_distance}

	return {}

func _get_object_type(object: Node) -> String:
	if object.has("object_type"):
		return object.object_type

	# Fallback to group detection
	if object.is_in_group("tree"):
		return "tree"
	elif object.is_in_group("rock"):
		return "rock"
	elif object.is_in_group("bush"):
		return "bush"
	elif object.is_in_group("water"):
		return "water"
	elif object.is_in_group("carcass"):
		return "carcass"
	elif object.is_in_group("container"):
		return "container"
	elif object.is_in_group("door"):
		return "door"

	return "unknown"

func _check_nearby_interactables():
	var player = get_parent()
	var player_pos = player.global_position

	var nearest = _find_nearest_interactable(player_pos)
	if not nearest.is_empty():
		interaction_available.emit(nearest.object, nearest.type)

func get_gather_progress() -> float:
	if not is_gathering:
		return 0.0
	return gather_timer / gather_duration

func is_currently_gathering() -> bool:
	return is_gathering
