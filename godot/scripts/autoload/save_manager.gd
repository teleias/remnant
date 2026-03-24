extends Node

# Server save endpoints
const SAVE_ENDPOINT: String = "https://api.remnantgame.com/api/save"
const LOAD_ENDPOINT: String = "https://api.remnantgame.com/api/load"

# Fallback to local filesystem
const SAVE_DIR: String = "user://saves/"
const AUTO_SAVE_SLOT: String = "auto"

# References
var game_state: Node
var http_request: HTTPRequest

func _ready() -> void:
	# Ensure save directory exists
	if not DirAccess.dir_exists_absolute(SAVE_DIR):
		DirAccess.make_dir_absolute(SAVE_DIR)

	# Create HTTP request node
	http_request = HTTPRequest.new()
	add_child(http_request)

	game_state = get_node("/root/GameState")

func save_game(slot_name: String = AUTO_SAVE_SLOT) -> bool:
	if not game_state:
		push_error("GameState not found")
		return false

	# Serialize game state
	var save_data = serialize_game_state()

	# Try server save first
	var server_success = await save_to_server(slot_name, save_data)

	# Fallback to local save
	if not server_success:
		return save_to_local(slot_name, save_data)

	return true

func load_game(slot_name: String) -> bool:
	# Try server load first
	var save_data = await load_from_server(slot_name)

	# Fallback to local load
	if save_data == null:
		save_data = load_from_local(slot_name)

	if save_data == null:
		return false

	# Deserialize and restore
	return deserialize_game_state(save_data)

func serialize_game_state() -> Dictionary:
	var data: Dictionary = {}

	# Player position from GameState (grid coords)
	if game_state:
		data["player_position"] = {
			"x": game_state.player_grid_x,
			"y": game_state.player_grid_y
		}

		# Player stats from GameState.stats dictionary
		data["player_stats"] = {
			"health": game_state.stats.get("health", 100.0),
			"hunger": game_state.stats.get("hunger", 85.0),
			"thirst": game_state.stats.get("thirst", 80.0),
			"fatigue": game_state.stats.get("fatigue", 100.0),
			"temperature": game_state.temperature
		}

		# Inventory from GameState
		data["inventory"] = game_state.inventory.duplicate(true)

		# Skills from GameState
		data["skills"] = game_state.skills.duplicate(true)

		# Conditions from GameState
		data["conditions"] = game_state.conditions.duplicate(true)

	# World state from GameState.time dictionary
	data["world"] = {
		"seed": game_state.world_seed if game_state else 0,
		"hour": game_state.time.hour if game_state else 8.0,
		"day": game_state.time.day if game_state else 1,
		"season": game_state.time.season if game_state else "summer",
		"weather": game_state.weather if game_state else "clear"
	}

	# World modifications
	data["world_mods"] = game_state.world_mods.duplicate(true) if game_state else {}

	# Meta
	data["meta"] = {
		"save_version": "1.0.0",
		"timestamp": Time.get_unix_time_from_system(),
		"total_play_time": game_state.total_play_time if game_state else 0.0
	}

	return data

func deserialize_game_state(data: Dictionary) -> bool:
	if not game_state:
		return false

	# Restore player position to GameState (grid coords)
	if "player_position" in data:
		var pos_data = data["player_position"]
		game_state.player_grid_x = pos_data.get("x", 128.0)
		game_state.player_grid_y = pos_data.get("y", 128.0)

	# Restore player stats to GameState.stats dictionary
	if "player_stats" in data:
		var saved_stats = data["player_stats"]
		game_state.stats.health = saved_stats.get("health", 100.0)
		game_state.stats.hunger = saved_stats.get("hunger", 85.0)
		game_state.stats.thirst = saved_stats.get("thirst", 80.0)
		game_state.stats.fatigue = saved_stats.get("fatigue", 100.0)
		game_state.temperature = saved_stats.get("temperature", 72.0)

	# Restore inventory to GameState
	if "inventory" in data:
		game_state.inventory = data["inventory"].duplicate(true)

	# Restore skills to GameState
	if "skills" in data:
		game_state.skills = data["skills"].duplicate(true)

	# Restore conditions to GameState
	if "conditions" in data:
		game_state.conditions = data["conditions"].duplicate(true)

	# Restore world state to GameState.time dictionary
	if "world" in data:
		var world = data["world"]
		game_state.world_seed = world.get("seed", 0)
		game_state.time.hour = world.get("hour", 8.0)
		game_state.time.day = world.get("day", 1)
		game_state.time.season = world.get("season", "summer")
		game_state.weather = world.get("weather", "clear")

	# Restore world modifications
	if "world_mods" in data:
		game_state.world_mods = data["world_mods"].duplicate(true)

	# Restore meta
	if "meta" in data:
		var meta = data["meta"]
		game_state.total_play_time = meta.get("total_play_time", 0.0)

	return true

# Server save/load
func save_to_server(slot_name: String, data: Dictionary) -> bool:
	var json_string = JSON.stringify(data)
	var headers = ["Content-Type: application/json"]
	var body = JSON.stringify({
		"slot": slot_name,
		"data": data
	})

	http_request.request(SAVE_ENDPOINT, headers, HTTPClient.METHOD_POST, body)

	var result = await http_request.request_completed

	if result[0] == HTTPRequest.RESULT_SUCCESS and result[1] == 200:
		return true

	return false

func load_from_server(slot_name: String) -> Variant:
	var url = LOAD_ENDPOINT + "/" + slot_name
	http_request.request(url)

	var result = await http_request.request_completed

	if result[0] == HTTPRequest.RESULT_SUCCESS and result[1] == 200:
		var json = JSON.new()
		var parse_result = json.parse(result[3].get_string_from_utf8())
		if parse_result == OK:
			return json.data

	return null

# Local save/load
func save_to_local(slot_name: String, data: Dictionary) -> bool:
	var file_path = SAVE_DIR + slot_name + ".save"
	var file = FileAccess.open(file_path, FileAccess.WRITE)

	if not file:
		push_error("Failed to open save file: " + file_path)
		return false

	var json_string = JSON.stringify(data)
	file.store_string(json_string)
	file.close()

	return true

func load_from_local(slot_name: String) -> Variant:
	var file_path = SAVE_DIR + slot_name + ".save"

	if not FileAccess.file_exists(file_path):
		return null

	var file = FileAccess.open(file_path, FileAccess.READ)
	if not file:
		return null

	var json_string = file.get_as_text()
	file.close()

	var json = JSON.new()
	var parse_result = json.parse(json_string)

	if parse_result != OK:
		push_error("Failed to parse save file")
		return null

	return json.data

func get_save_slots() -> Array:
	var slots: Array = []

	# Check local saves
	var dir = DirAccess.open(SAVE_DIR)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if file_name.ends_with(".save"):
				var slot_name = file_name.replace(".save", "")
				slots.append(slot_name)
			file_name = dir.get_next()
		dir.list_dir_end()

	return slots

func delete_save(slot_name: String) -> bool:
	var file_path = SAVE_DIR + slot_name + ".save"

	if FileAccess.file_exists(file_path):
		var err = DirAccess.remove_absolute(file_path)
		return err == OK

	return false

func auto_save() -> void:
	save_game(AUTO_SAVE_SLOT)
