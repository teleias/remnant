extends Node

# Drain rates (per game hour)
const HUNGER_DRAIN_BASE = 1.8
const HUNGER_DRAIN_SPRINT_MULTIPLIER = 1.5

const THIRST_DRAIN_BASE = 2.5
const THIRST_DRAIN_SPRINT_MULTIPLIER = 1.3

const FATIGUE_DRAIN_BASE = 4.2
const FATIGUE_DRAIN_SPRINT_MULTIPLIER = 2.0
const FATIGUE_DRAIN_SNEAK_MULTIPLIER = 0.7

# Health effects
const STARVATION_DAMAGE = 3.0  # per hour at hunger=0
const DEHYDRATION_DAMAGE = 5.0  # per hour at thirst=0
const COLD_DAMAGE = 2.0  # per hour below 35F
const HEAT_DAMAGE = 1.5  # per hour above 100F

# Health regeneration
const HEALTH_REGEN = 0.5  # per hour when well-fed/hydrated/rested

# Temperature thresholds
const TEMP_COLD = 35.0
const TEMP_HOT = 100.0
const TEMP_COMFORTABLE_MIN = 60.0
const TEMP_COMFORTABLE_MAX = 80.0

# Weather base temperatures
var weather_temps = {
	"clear": 72.0,
	"cloudy": 68.0,
	"rain": 55.0,
	"heavy_rain": 50.0,
	"snow": 25.0,
	"blizzard": 10.0,
	"fog": 62.0,
}

# Time of day temperature modifiers
var time_temp_modifiers = {
	"night": -15.0,
	"dawn": -5.0,
	"day": 5.0,
	"dusk": -8.0,
}

# Update interval (real seconds)
const UPDATE_INTERVAL = 1.0
var update_timer: float = 0.0

# References
var time_system: Node = null

func _ready():
	set_process(true)
	# Find time system
	await get_tree().process_frame
	time_system = get_tree().get_first_node_in_group("time_system")

func _process(delta: float):
	update_timer += delta
	if update_timer >= UPDATE_INTERVAL:
		update_timer = 0.0
		update_survival(UPDATE_INTERVAL)

func update_survival(delta: float):
	var gs = get_node("/root/GameState")
	if not gs:
		return

	# Convert real seconds to game hours
	var game_hours = delta / 60.0  # 60 real seconds = 1 game hour

	# Update hunger
	var hunger_drain = HUNGER_DRAIN_BASE * game_hours
	if gs.player_sprinting:
		hunger_drain *= HUNGER_DRAIN_SPRINT_MULTIPLIER
	gs.modify_stat("hunger", -hunger_drain)

	# Update thirst
	var thirst_drain = THIRST_DRAIN_BASE * game_hours
	if gs.player_sprinting:
		thirst_drain *= THIRST_DRAIN_SPRINT_MULTIPLIER
	gs.modify_stat("thirst", -thirst_drain)

	# Update fatigue
	var fatigue_drain = FATIGUE_DRAIN_BASE * game_hours
	if gs.player_sprinting:
		fatigue_drain *= FATIGUE_DRAIN_SPRINT_MULTIPLIER
	elif gs.player_sneaking:
		fatigue_drain *= FATIGUE_DRAIN_SNEAK_MULTIPLIER
	gs.modify_stat("fatigue", -fatigue_drain)

	# Update temperature
	update_temperature(gs)

	# Apply health effects
	apply_health_effects(gs, game_hours)

	# Update conditions
	gs.update_conditions(delta)

func update_temperature(gs):
	# Base temperature from weather
	var base_temp = weather_temps.get(gs.weather, 72.0)

	# Time of day modifier
	var time_mod = 0.0
	if time_system:
		match time_system.current_phase:
			0:  # NIGHT
				time_mod = time_temp_modifiers.night
			1:  # DAWN
				time_mod = time_temp_modifiers.dawn
			2:  # DAY
				time_mod = time_temp_modifiers.day
			3:  # DUSK
				time_mod = time_temp_modifiers.dusk

	# Season modifier
	var season_mod = 0.0
	match gs.time.season:
		"spring":
			season_mod = 0.0
		"summer":
			season_mod = 10.0
		"autumn":
			season_mod = -5.0
		"winter":
			season_mod = -20.0

	# TODO: Clothing modifier (from equipped items)
	var clothing_mod = 0.0

	# TODO: Campfire/shelter modifier
	var shelter_mod = 0.0

	# Calculate final temperature
	gs.temperature = base_temp + time_mod + season_mod + clothing_mod + shelter_mod

func apply_health_effects(gs, game_hours: float):
	var health_change = 0.0

	# Starvation damage
	if gs.stats.hunger <= 0:
		health_change -= STARVATION_DAMAGE * game_hours

	# Dehydration damage
	if gs.stats.thirst <= 0:
		health_change -= DEHYDRATION_DAMAGE * game_hours

	# Cold damage
	if gs.temperature < TEMP_COLD:
		var severity = (TEMP_COLD - gs.temperature) / 35.0
		health_change -= COLD_DAMAGE * severity * game_hours

	# Heat damage
	if gs.temperature > TEMP_HOT:
		var severity = (gs.temperature - TEMP_HOT) / 30.0
		health_change -= HEAT_DAMAGE * severity * game_hours

	# Health regeneration (when well-fed, hydrated, and rested)
	if gs.stats.hunger > 80 and gs.stats.thirst > 80 and gs.stats.fatigue > 20:
		health_change += HEALTH_REGEN * game_hours

	# Apply health change
	if health_change != 0.0:
		gs.modify_stat("health", health_change)

func consume_food(item_id: String):
	var gs = get_node("/root/GameState")
	if not gs:
		return

	# Food database (placeholder - should be externalized)
	var food_data = {
		"berry": {"hunger": 5, "thirst": 2},
		"cooked_meat": {"hunger": 25, "thirst": -5},
		"raw_meat": {"hunger": 15, "thirst": -3},
		"bread": {"hunger": 20, "thirst": -2},
		"apple": {"hunger": 8, "thirst": 5},
		"mushroom": {"hunger": 6, "thirst": 1},
	}

	if food_data.has(item_id):
		var data = food_data[item_id]
		gs.modify_stat("hunger", data.hunger)
		gs.modify_stat("thirst", data.thirst)
		print("Consumed ", item_id, ": +", data.hunger, " hunger, +", data.thirst, " thirst")

func consume_drink(item_id: String):
	var gs = get_node("/root/GameState")
	if not gs:
		return

	var drink_data = {
		"water": {"thirst": 30},
		"dirty_water": {"thirst": 20},  # TODO: Add disease chance
		"juice": {"thirst": 25, "hunger": 5},
		"coffee": {"thirst": 15, "fatigue": 20},
	}

	if drink_data.has(item_id):
		var data = drink_data[item_id]
		gs.modify_stat("thirst", data.get("thirst", 0))
		gs.modify_stat("hunger", data.get("hunger", 0))
		gs.modify_stat("fatigue", data.get("fatigue", 0))
		print("Consumed ", item_id)

func rest(hours: float):
	var gs = get_node("/root/GameState")
	if not gs:
		return

	# Restore fatigue based on sleep quality
	var fatigue_restore = hours * 15.0  # 15 fatigue per hour of sleep
	gs.modify_stat("fatigue", fatigue_restore)

	# Advance time
	gs.time.hour += hours
	if gs.time.hour >= 24.0:
		gs.time.hour -= 24.0
		gs.time.day += 1

	print("Rested for ", hours, " hours. Fatigue restored: ", fatigue_restore)

func get_comfort_level() -> String:
	var gs = get_node("/root/GameState")
	if not gs:
		return "Unknown"

	var temp = gs.temperature

	if temp < TEMP_COLD:
		return "Freezing"
	elif temp < TEMP_COMFORTABLE_MIN:
		return "Cold"
	elif temp >= TEMP_COMFORTABLE_MIN and temp <= TEMP_COMFORTABLE_MAX:
		return "Comfortable"
	elif temp > TEMP_HOT:
		return "Overheating"
	elif temp > TEMP_COMFORTABLE_MAX:
		return "Warm"
	else:
		return "Comfortable"

func get_hunger_status() -> String:
	var gs = get_node("/root/GameState")
	if not gs:
		return "Unknown"

	var hunger = gs.stats.hunger

	if hunger <= 0:
		return "Starving"
	elif hunger <= 20:
		return "Very Hungry"
	elif hunger <= 40:
		return "Hungry"
	elif hunger <= 70:
		return "Peckish"
	else:
		return "Well Fed"

func get_thirst_status() -> String:
	var gs = get_node("/root/GameState")
	if not gs:
		return "Unknown"

	var thirst = gs.stats.thirst

	if thirst <= 0:
		return "Dehydrated"
	elif thirst <= 20:
		return "Very Thirsty"
	elif thirst <= 40:
		return "Thirsty"
	elif thirst <= 70:
		return "Parched"
	else:
		return "Hydrated"

func get_fatigue_status() -> String:
	var gs = get_node("/root/GameState")
	if not gs:
		return "Unknown"

	var fatigue = gs.stats.fatigue

	if fatigue <= 0:
		return "Exhausted"
	elif fatigue <= 20:
		return "Very Tired"
	elif fatigue <= 40:
		return "Tired"
	elif fatigue <= 70:
		return "Weary"
	else:
		return "Energetic"
