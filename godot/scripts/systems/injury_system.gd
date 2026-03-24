extends Node

signal condition_added(condition_type: String, severity: int)
signal condition_removed(condition_type: String)
signal condition_updated(condition_type: String, severity: int)

# Condition types and their effects
const CONDITION_DEFS = {
	"bleeding": {
		"name": "Bleeding",
		"health_per_hour": -2,
		"speed_modifier": 1.0,
		"cure": ["bandage"]
	},
	"fractured": {
		"name": "Fractured Bone",
		"health_per_hour": 0,
		"speed_modifier": 0.5,
		"cure": ["splint"]
	},
	"infected": {
		"name": "Infection",
		"health_per_hour": -1,
		"speed_modifier": 1.0,
		"cure": ["disinfectant", "antibiotics"],
		"escalates": true
	},
	"pain": {
		"name": "Pain",
		"health_per_hour": 0,
		"speed_modifier": 0.9,
		"damage_modifier": 0.8,
		"cure": ["painkillers"]
	},
	"sick": {
		"name": "Sickness",
		"health_per_hour": -1,
		"speed_modifier": 0.9,
		"cure": ["antibiotics"]
	},
	"exhausted": {
		"name": "Exhausted",
		"health_per_hour": 0,
		"speed_modifier": 0.7,
		"cure": []
	},
	"starving": {
		"name": "Starving",
		"health_per_hour": -3,
		"speed_modifier": 0.8,
		"cure": []
	},
	"dehydrated": {
		"name": "Dehydrated",
		"health_per_hour": -4,
		"speed_modifier": 0.7,
		"cure": []
	},
	"hypothermia": {
		"name": "Hypothermia",
		"health_per_hour": -2,
		"speed_modifier": 0.6,
		"cure": []
	}
}

var active_conditions: Array = [] # Array of {type, severity, duration, elapsed}

var tick_timer: float = 0.0
const TICK_INTERVAL = 60.0 # Tick every 60 seconds (1 game minute)

func _ready():
	add_to_group("injury_system")

func _process(delta):
	tick_timer += delta
	if tick_timer >= TICK_INTERVAL:
		tick_timer = 0.0
		_tick_conditions()

# ===== CONDITION MANAGEMENT =====

func add_condition(condition_type: String, severity: int, duration: float):
	if not CONDITION_DEFS.has(condition_type):
		print("Unknown condition type: ", condition_type)
		return

	# Check if already have this condition
	var existing = _find_condition(condition_type)
	if existing != null:
		# Increase severity if worse
		if severity > existing.severity:
			existing.severity = severity
			existing.duration = max(existing.duration, duration)
			condition_updated.emit(condition_type, severity)
		return

	# Add new condition
	var condition = {
		"type": condition_type,
		"severity": severity,
		"duration": duration,
		"elapsed": 0.0
	}

	active_conditions.append(condition)
	condition_added.emit(condition_type, severity)

func remove_condition(condition_type: String):
	for i in range(active_conditions.size()):
		if active_conditions[i].type == condition_type:
			active_conditions.remove_at(i)
			condition_removed.emit(condition_type)
			return

func has_condition(condition_type: String) -> bool:
	return _find_condition(condition_type) != null

func get_condition(condition_type: String) -> Dictionary:
	var cond = _find_condition(condition_type)
	if cond == null:
		return {}
	return cond

func treat_condition(condition_type: String, effectiveness: int):
	var cond = _find_condition(condition_type)
	if cond == null:
		return

	# Reduce severity
	cond.severity -= effectiveness / 50.0
	if cond.severity <= 0:
		remove_condition(condition_type)
	else:
		condition_updated.emit(condition_type, cond.severity)

func _find_condition(condition_type: String):
	for cond in active_conditions:
		if cond.type == condition_type:
			return cond
	return null

# ===== CONDITION TICKING =====

func _tick_conditions():
	var gs = get_node("/root/GameState")
	if gs == null:
		return

	for i in range(active_conditions.size() - 1, -1, -1):
		var cond = active_conditions[i]
		cond.elapsed += TICK_INTERVAL

		# Apply health damage
		var def = CONDITION_DEFS.get(cond.type, {})
		var health_per_hour = def.get("health_per_hour", 0)
		if health_per_hour != 0:
			var damage = health_per_hour * (TICK_INTERVAL / 3600.0) * cond.severity
			gs.modify_stat("health", damage)

		# Escalate infection
		if def.get("escalates", false):
			cond.severity += 0.1

		# Check duration
		if cond.elapsed >= cond.duration:
			active_conditions.remove_at(i)
			condition_removed.emit(cond.type)

# ===== STAT-TRIGGERED CONDITIONS =====

func check_stat_conditions(stats: Dictionary):
	# Exhausted
	if stats.get("fatigue", 100) < 10:
		if not has_condition("exhausted"):
			add_condition("exhausted", 1, 3600.0) # 1 hour
	else:
		if has_condition("exhausted"):
			remove_condition("exhausted")

	# Starving
	if stats.get("hunger", 100) <= 0:
		if not has_condition("starving"):
			add_condition("starving", 2, -1) # Infinite until fed
	else:
		if has_condition("starving"):
			remove_condition("starving")

	# Dehydrated
	if stats.get("thirst", 100) <= 0:
		if not has_condition("dehydrated"):
			add_condition("dehydrated", 2, -1)
	else:
		if has_condition("dehydrated"):
			remove_condition("dehydrated")

	# Hypothermia
	if stats.get("temperature", 98.6) < 95.0:
		if not has_condition("hypothermia"):
			add_condition("hypothermia", 2, 1800.0) # 30 min
	else:
		if has_condition("hypothermia"):
			remove_condition("hypothermia")

# ===== MODIFIERS =====

func get_speed_modifier() -> float:
	var modifier = 1.0
	for cond in active_conditions:
		var def = CONDITION_DEFS.get(cond.type, {})
		var speed_mod = def.get("speed_modifier", 1.0)
		modifier *= speed_mod
	return modifier

func get_damage_modifier() -> float:
	var modifier = 1.0
	for cond in active_conditions:
		var def = CONDITION_DEFS.get(cond.type, {})
		var dmg_mod = def.get("damage_modifier", 1.0)
		modifier *= dmg_mod
	return modifier

func get_all_conditions() -> Array:
	var conditions_with_names = []
	for cond in active_conditions:
		var def = CONDITION_DEFS.get(cond.type, {})
		conditions_with_names.append({
			"type": cond.type,
			"name": def.get("name", cond.type),
			"severity": cond.severity,
			"duration": cond.duration,
			"elapsed": cond.elapsed
		})
	return conditions_with_names

# ===== COMBAT INJURY ROLLS =====

func roll_combat_injuries(damage_taken: int):
	# Bleeding chance (>10 damage = 30%)
	if damage_taken > 10 and randf() < 0.3:
		add_condition("bleeding", 1, 3600.0) # 1 hour

	# Fracture chance (>20 damage = 20%)
	if damage_taken > 20 and randf() < 0.2:
		add_condition("fractured", 1, 7200.0) # 2 hours

	# Infection chance (>15 damage = 15%)
	if damage_taken > 15 and randf() < 0.15:
		add_condition("infected", 1, 1800.0) # 30 minutes

	# Pain (any damage > 5 = 40%)
	if damage_taken > 5 and randf() < 0.4:
		add_condition("pain", 1, 1200.0) # 20 minutes
