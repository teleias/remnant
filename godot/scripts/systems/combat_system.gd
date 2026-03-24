extends Node

signal attack_performed(target_position: Vector2)
signal enemy_hit(enemy: Node, damage: int)
signal player_hit(damage: int, source: String)

const ATTACK_COOLDOWN = 0.8 # seconds
const MELEE_RANGE = 64 * 1.5 # 1.5 tiles
const ATTACK_ARC_DEGREES = 108
const DAMAGE_NUMBER_SCENE = preload("res://scenes/ui/damage_number.tscn") # Will create this

var inventory_system: Node
var skill_system: Node

var attack_ready: bool = true
var attack_timer: float = 0.0

func _ready():
	pass

func _process(delta):
	if not attack_ready:
		attack_timer += delta
		if attack_timer >= ATTACK_COOLDOWN:
			attack_ready = true
			attack_timer = 0.0

func initialize(inv_system: Node, skills_system: Node):
	inventory_system = inv_system
	skill_system = skills_system

func try_attack(player_pos: Vector2, facing_direction: Vector2) -> bool:
	if not attack_ready:
		return false

	attack_ready = false
	attack_timer = 0.0

	var weapon = inventory_system.get_equipped_weapon()
	var weapon_data = weapon if not weapon.is_empty() else _get_fist_data()

	var damage = _calculate_damage(weapon_data)
	var attack_range = weapon_data.get("range", 1.0) * 64 # Convert tiles to pixels

	# Get attack speed modifier
	var attack_speed = weapon_data.get("attack_speed", 1.0)
	# Modify cooldown (lower attack_speed = faster attacks)
	# attack_timer will reset based on ATTACK_COOLDOWN / attack_speed

	attack_performed.emit(player_pos + facing_direction * attack_range)

	# Detect enemies in arc
	var enemies_hit = _get_enemies_in_arc(player_pos, facing_direction, attack_range)

	var hit_any = false
	for enemy in enemies_hit:
		_deal_damage_to_enemy(enemy, damage)
		hit_any = true

	# Grant XP
	if hit_any:
		skill_system.add_xp("strength", 3)
		skill_system.add_xp("fitness", 2)
	else:
		skill_system.add_xp("fitness", 1) # Miss still grants some fitness

	# Degrade weapon
	if not weapon.is_empty():
		var weapon_slot = inventory_system.find_slot_with_item(weapon.id)
		if weapon_slot != -1:
			inventory_system.degrade_item(weapon_slot, 1)

	return true

func _calculate_damage(weapon_data: Dictionary) -> int:
	var base_damage = weapon_data.get("damage", 5)

	# Condition modifier
	var condition = weapon_data.get("condition", 100)
	var max_condition = weapon_data.get("max_condition", 100)
	var condition_mod = 0.5 + 0.5 * (float(condition) / max_condition)

	# Strength bonus (assume strength increases damage by 5% per level)
	var strength_level = skill_system.get_skill_level("strength")
	var strength_bonus = 1.0 + (strength_level * 0.05)

	# Random variance
	var random_variance = randf_range(0.9, 1.1)

	var final_damage = base_damage * condition_mod * strength_bonus * random_variance
	return int(final_damage)

func _get_fist_data() -> Dictionary:
	return {
		"name": "Fists",
		"damage": 5,
		"range": 1.0,
		"attack_speed": 1.2,
		"condition": 100,
		"max_condition": 100
	}

func _get_enemies_in_arc(player_pos: Vector2, facing_direction: Vector2, attack_range: float) -> Array:
	var enemies = []

	# Get all enemies in the scene
	var world = get_tree().get_first_node_in_group("world")
	if world == null:
		return enemies

	var all_enemies = get_tree().get_nodes_in_group("enemies")

	for enemy in all_enemies:
		var enemy_pos = enemy.global_position
		var distance = player_pos.distance_to(enemy_pos)

		# Check range
		if distance > attack_range:
			continue

		# Check arc
		var direction_to_enemy = (enemy_pos - player_pos).normalized()
		var angle = facing_direction.angle_to(direction_to_enemy)
		var angle_degrees = rad_to_deg(abs(angle))

		if angle_degrees <= ATTACK_ARC_DEGREES / 2.0:
			enemies.append(enemy)

	return enemies

func _deal_damage_to_enemy(enemy: Node, damage: int):
	if enemy.has_method("take_damage"):
		enemy.take_damage(damage)

	# Show damage number
	_show_damage_number(enemy.global_position, damage)

	enemy_hit.emit(enemy, damage)

func _show_damage_number(position: Vector2, damage: int):
	# Create floating damage number
	var damage_label = Label.new()
	damage_label.text = str(damage)
	damage_label.add_theme_font_size_override("font_size", 20)
	damage_label.add_theme_color_override("font_color", Color.RED)
	damage_label.global_position = position - Vector2(10, 30)
	damage_label.z_index = 100

	get_tree().current_scene.add_child(damage_label)

	# Animate (float up and fade)
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(damage_label, "position", damage_label.position - Vector2(0, 40), 1.0)
	tween.tween_property(damage_label, "modulate:a", 0.0, 1.0)
	tween.finished.connect(func(): damage_label.queue_free())

# ===== PLAYER TAKING DAMAGE =====

func damage_player(amount: int, source: String = "unknown"):
	# Apply damage to player health via GameState
	var gs = get_node("/root/GameState")
	if gs:
		gs.modify_stat("health", -amount)

	# Screen flash
	_screen_flash()

	# Roll for injury conditions
	_roll_for_injuries(amount)

	player_hit.emit(amount, source)

func _roll_for_injuries(damage: int):
	var injury_system = get_tree().get_first_node_in_group("injury_system")
	if injury_system == null:
		return

	# Bleeding chance (>10 damage = 30%)
	if damage > 10 and randf() < 0.3:
		injury_system.add_condition("bleeding", 1, 3600.0) # 1 hour

	# Fracture chance (>20 damage = 20%)
	if damage > 20 and randf() < 0.2:
		injury_system.add_condition("fractured", 1, 7200.0) # 2 hours

	# Infection chance (>15 damage = 15%)
	if damage > 15 and randf() < 0.15:
		injury_system.add_condition("infected", 1, 1800.0) # 30 minutes

func _screen_flash():
	# Flash the screen red briefly
	var flash = ColorRect.new()
	flash.color = Color(1, 0, 0, 0.3)
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	flash.z_index = 999

	get_tree().current_scene.add_child(flash)

	var tween = create_tween()
	tween.tween_property(flash, "modulate:a", 0.0, 0.3)
	tween.finished.connect(func(): flash.queue_free())

# ===== UTILITY =====

func is_attack_ready() -> bool:
	return attack_ready

func get_attack_cooldown_progress() -> float:
	if attack_ready:
		return 1.0
	return attack_timer / ATTACK_COOLDOWN

func get_equipped_weapon_info() -> Dictionary:
	var weapon = inventory_system.get_equipped_weapon()
	if weapon.is_empty():
		return _get_fist_data()
	return weapon
