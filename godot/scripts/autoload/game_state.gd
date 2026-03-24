class_name GameStateClass
extends Node

# World
var world_seed: int = 0
var world_size: int = 256

# Player position (grid coordinates)
var player_grid_x: float = 128.0
var player_grid_y: float = 128.0
var player_direction: String = "S"
var player_moving: bool = false
var player_sprinting: bool = false
var player_sneaking: bool = false

# Survival stats (0-100)
var stats: Dictionary = {
	"health": 100.0,
	"hunger": 85.0,
	"thirst": 80.0,
	"fatigue": 100.0,
}

# Temperature in Fahrenheit
var temperature: float = 72.0

# Time system
var time: Dictionary = {
	"hour": 8.0,  # Start at 8 AM
	"day": 1,
	"season": "summer",  # spring, summer, autumn, winter
}
var total_play_time: float = 0.0

# Skills (0-10 level, XP tracking)
var skills: Dictionary = {
	"foraging": {"level": 0, "xp": 0},
	"cooking": {"level": 0, "xp": 0},
	"carpentry": {"level": 0, "xp": 0},
	"fitness": {"level": 0, "xp": 0},
	"strength": {"level": 0, "xp": 0},
	"tracking": {"level": 0, "xp": 0},
	"first_aid": {"level": 0, "xp": 0},
	"stealth": {"level": 0, "xp": 0},
	"tailoring": {"level": 0, "xp": 0},
}

# Inventory
var inventory: Dictionary = {
	"slots": [],  # Array of {item_id, quantity, condition} or null
	"max_slots": 20,
	"equipped": {
		"head": null, "torso": null, "legs": null, "feet": null,
		"hands": null, "back": null, "mainHand": null, "offHand": null,
	},
	"hotbar": [null, null, null, null, null, null],  # 6 slots
}

# Conditions/injuries
var conditions: Array = []  # [{type, severity, duration}]

# Weather
var weather: String = "clear"

# Kill tracking
var animals_killed: int = 0

# World modifications (for save/load)
var world_mods: Dictionary = {
	"harvested_tiles": [],
	"placed_structures": [],
	"opened_containers": [],
	"dropped_items": [],
}

# Signals
signal stat_changed(stat_name: String, value: float)
signal inventory_changed
signal time_changed(hour: float, day: int, season: String)
signal weather_changed(weather_type: String)
signal player_died(cause: String)
signal skill_levelup(skill: String, level: int)

func _ready():
	randomize()

func reset_for_new_game(seed_val: int = 0):
	if seed_val == 0:
		world_seed = randi()
	else:
		world_seed = seed_val
	player_grid_x = 128.0
	player_grid_y = 128.0
	stats = {"health": 100.0, "hunger": 85.0, "thirst": 80.0, "fatigue": 100.0}
	temperature = 72.0
	time = {"hour": 8.0, "day": 1, "season": "summer"}
	total_play_time = 0.0
	weather = "clear"
	animals_killed = 0
	conditions.clear()
	world_mods = {"harvested_tiles": [], "placed_structures": [], "opened_containers": [], "dropped_items": []}
	# Initialize empty inventory
	inventory.slots.clear()
	for i in range(inventory.max_slots):
		inventory.slots.append(null)
	inventory.equipped = {"head": null, "torso": null, "legs": null, "feet": null, "hands": null, "back": null, "mainHand": null, "offHand": null}
	inventory.hotbar = [null, null, null, null, null, null]
	# Reset skills
	for skill_name in skills:
		skills[skill_name] = {"level": 0, "xp": 0}

func grant_xp(skill_name: String, amount: int):
	if not skills.has(skill_name): return
	var sk = skills[skill_name]
	sk.xp += amount
	var needed = (sk.level + 1) * 100
	if sk.xp >= needed and sk.level < 10:
		sk.level += 1
		sk.xp -= needed
		skill_levelup.emit(skill_name, sk.level)

func add_item(item_id: String, quantity: int = 1, condition: float = 100.0) -> bool:
	# Try to stack with existing
	for slot in inventory.slots:
		if slot != null and slot.item_id == item_id:
			slot.quantity += quantity
			inventory_changed.emit()
			return true
	# Find empty slot
	for i in range(inventory.slots.size()):
		if inventory.slots[i] == null:
			inventory.slots[i] = {
				"item_id": item_id,
				"quantity": quantity,
				"condition": condition
			}
			inventory_changed.emit()
			return true
	return false  # Inventory full

func remove_item(item_id: String, quantity: int = 1) -> bool:
	for slot in inventory.slots:
		if slot != null and slot.item_id == item_id:
			if slot.quantity >= quantity:
				slot.quantity -= quantity
				if slot.quantity <= 0:
					inventory.slots[inventory.slots.find(slot)] = null
				inventory_changed.emit()
				return true
	return false

func has_item(item_id: String, quantity: int = 1) -> bool:
	var total = 0
	for slot in inventory.slots:
		if slot != null and slot.item_id == item_id:
			total += slot.quantity
	return total >= quantity

func update_stat(stat_name: String, value: float):
	if not stats.has(stat_name): return
	stats[stat_name] = clamp(value, 0.0, 100.0)
	stat_changed.emit(stat_name, stats[stat_name])

	# Check death conditions
	if stats.health <= 0:
		player_died.emit("health_depleted")
	elif stats.hunger <= 0 and stats.health < 10:
		player_died.emit("starvation")
	elif stats.thirst <= 0 and stats.health < 10:
		player_died.emit("dehydration")

func modify_stat(stat_name: String, delta: float):
	if not stats.has(stat_name): return
	update_stat(stat_name, stats[stat_name] + delta)

func add_condition(condition_type: String, severity: float, duration: float):
	conditions.append({
		"type": condition_type,
		"severity": severity,
		"duration": duration,
		"elapsed": 0.0
	})

func update_conditions(delta: float):
	for i in range(conditions.size() - 1, -1, -1):
		conditions[i].elapsed += delta
		if conditions[i].elapsed >= conditions[i].duration:
			conditions.remove_at(i)

func save_game(slot: String):
	var save_data = {
		"world_seed": world_seed,
		"player_grid_x": player_grid_x,
		"player_grid_y": player_grid_y,
		"stats": stats,
		"temperature": temperature,
		"time": time,
		"total_play_time": total_play_time,
		"skills": skills,
		"inventory": inventory,
		"conditions": conditions,
		"weather": weather,
		"world_mods": world_mods,
	}
	var file = FileAccess.open("user://save_" + slot + ".dat", FileAccess.WRITE)
	if file:
		file.store_var(save_data)
		file.close()
		return true
	return false

func load_game(slot: String) -> bool:
	var file = FileAccess.open("user://save_" + slot + ".dat", FileAccess.READ)
	if not file:
		return false
	var save_data = file.get_var()
	file.close()

	world_seed = save_data.world_seed
	player_grid_x = save_data.player_grid_x
	player_grid_y = save_data.player_grid_y
	stats = save_data.stats
	temperature = save_data.temperature
	time = save_data.time
	total_play_time = save_data.total_play_time
	skills = save_data.skills
	inventory = save_data.inventory
	conditions = save_data.conditions
	weather = save_data.weather
	world_mods = save_data.world_mods

	return true
