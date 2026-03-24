class_name AnimalAI
extends CharacterBody2D

# Animal configuration
@export var animal_type: String = "deer"
@export var max_hp: int = 40

# State variables
var hp: int
var state: String = "idle"
var spawn_pos: Vector2
var target_pos: Vector2
var ai_timer: float = 0.0
var attack_cooldown: float = 0.0
var is_dead: bool = false
var loot_drops: Array = []
var state_timer: float = 0.0
var wander_wait_time: float = 0.0
var territory_center: Vector2
var is_charging: bool = false
var first_strike_available: bool = true
var pack_members: Array = []
var warned: bool = false

# Animal configs
var animal_configs: Dictionary = {
	"deer": {
		"type": "prey",
		"max_hp": 40,
		"speed": 100,
		"behavior": "flee",
		"group_size": [2, 5],
		"drops": ["raw_venison", "raw_venison", "raw_venison", "pelt_deer", "fat"],
		"detection_range": 15.0
	},
	"elk": {
		"type": "prey",
		"max_hp": 60,
		"speed": 85,
		"behavior": "flee_charge",
		"group_size": [3, 8],
		"drops": ["raw_venison", "raw_venison", "raw_venison", "raw_venison", "raw_venison", "pelt_deer", "pelt_deer", "fat", "fat"],
		"detection_range": 15.0,
		"charge_hp_threshold": 0.3,
		"charge_damage": 20
	},
	"rabbit": {
		"type": "prey",
		"max_hp": 10,
		"speed": 140,
		"behavior": "flee",
		"group_size": [1, 2],
		"drops": ["raw_rabbit"],
		"detection_range": 12.0
	},
	"squirrel": {
		"type": "prey",
		"max_hp": 5,
		"speed": 120,
		"behavior": "flee",
		"group_size": [1, 1],
		"drops": ["raw_rabbit"],
		"detection_range": 10.0
	},
	"wolf": {
		"type": "predator",
		"max_hp": 50,
		"speed": 110,
		"behavior": "pack_hunt",
		"group_size": [3, 5],
		"drops": ["raw_meat", "raw_meat", "pelt_wolf"],
		"detection_range": 25.0,
		"attack_damage": 12,
		"attack_cooldown": 2.0,
		"attack_range": 1.5
	},
	"bear": {
		"type": "predator",
		"max_hp": 120,
		"speed": 70,
		"behavior": "territorial",
		"group_size": [1, 1],
		"drops": ["raw_meat", "raw_meat", "raw_meat", "raw_meat", "raw_meat", "raw_meat", "pelt_bear", "fat", "fat", "fat"],
		"detection_range": 20.0,
		"attack_damage": 25,
		"attack_cooldown": 3.0,
		"attack_range": 2.0,
		"territory_radius": 20.0,
		"warn_distance": 12.0,
		"charge_distance": 6.0
	},
	"cougar": {
		"type": "predator",
		"max_hp": 60,
		"speed": 130,
		"behavior": "ambush",
		"group_size": [1, 1],
		"drops": ["raw_meat", "raw_meat", "raw_meat", "leather", "leather"],
		"detection_range": 30.0,
		"attack_damage": 20,
		"attack_cooldown": 2.5,
		"attack_range": 4.0,
		"stalk_speed": 30,
		"first_strike_multiplier": 2.0
	},
	"coyote": {
		"type": "predator",
		"max_hp": 30,
		"speed": 100,
		"behavior": "opportunistic",
		"group_size": [1, 3],
		"drops": ["raw_meat"],
		"detection_range": 20.0,
		"attack_damage": 6,
		"attack_cooldown": 1.5,
		"attack_range": 1.5,
		"attack_hp_threshold": 40
	}
}

var config: Dictionary

# Signals
signal animal_died(animal: AnimalAI)
signal animal_attacked_player(damage: int, source: String)

# References
var player: CharacterBody2D
var game_state: Node

@onready var sprite: Sprite2D = $Sprite2D
@onready var collision: CollisionShape2D = $CollisionShape2D

const TILE_SIZE: int = 32
const AI_TICK_RATE: float = 0.25
const WANDER_RADIUS: float = 8.0

func _ready() -> void:
	# Get configuration
	if animal_type in animal_configs:
		config = animal_configs[animal_type]
		max_hp = config.max_hp
		hp = max_hp
		loot_drops = config.drops.duplicate()
	else:
		push_error("Unknown animal type: " + animal_type)
		queue_free()
		return

	# Set y-sort
	y_sort_enabled = true

	# Initialize position
	spawn_pos = global_position
	territory_center = spawn_pos
	target_pos = spawn_pos

	# Find player and game state
	await get_tree().process_frame
	player = get_tree().get_first_node_in_group("player")
	game_state = get_node("/root/GameState")

	# Set sprite color based on type (placeholder visuals)
	if sprite:
		match config.type:
			"prey":
				sprite.modulate = Color(0.8, 0.6, 0.4)
			"predator":
				sprite.modulate = Color(0.6, 0.3, 0.3)

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	# Update timers
	ai_timer += delta
	attack_cooldown = max(0.0, attack_cooldown - delta)
	state_timer += delta
	wander_wait_time = max(0.0, wander_wait_time - delta)

	# AI tick
	if ai_timer >= AI_TICK_RATE:
		ai_timer = 0.0
		update_ai()

	# Execute current state
	execute_state(delta)

	# Apply movement
	move_and_slide()

func update_ai() -> void:
	if not player:
		return

	var distance_to_player = global_position.distance_to(player.global_position)
	var player_noise_level = 0.0
	if game_state:
		# Sprinting = noisy, sneaking = quiet
		if game_state.player_sprinting:
			player_noise_level = 1.0
		elif game_state.player_sneaking:
			player_noise_level = -0.5
	var effective_detection = config.detection_range * (1.0 + player_noise_level * 0.5)

	match config.type:
		"prey":
			update_prey_ai(distance_to_player, effective_detection)
		"predator":
			update_predator_ai(distance_to_player, effective_detection)

func update_prey_ai(distance: float, detection_range: float) -> void:
	match state:
		"idle", "wander":
			if distance < detection_range:
				change_state("flee")
			elif state == "idle" and wander_wait_time <= 0.0:
				change_state("wander")

		"flee":
			if distance > detection_range * 1.5:
				if global_position.distance_to(spawn_pos) > WANDER_RADIUS * TILE_SIZE:
					change_state("return")
				else:
					change_state("idle")

		"charge":
			# Elk charge behavior
			if distance > 3.0 * TILE_SIZE or state_timer > 5.0:
				change_state("flee")

		"return":
			if global_position.distance_to(spawn_pos) < TILE_SIZE:
				change_state("idle")

func update_predator_ai(distance: float, detection_range: float) -> void:
	match config.behavior:
		"pack_hunt":
			update_pack_hunt_ai(distance, detection_range)
		"territorial":
			update_territorial_ai(distance)
		"ambush":
			update_ambush_ai(distance, detection_range)
		"opportunistic":
			update_opportunistic_ai(distance, detection_range)

func update_pack_hunt_ai(distance: float, detection_range: float) -> void:
	match state:
		"idle", "wander":
			if distance < detection_range:
				change_state("stalk")
			elif state == "idle" and wander_wait_time <= 0.0:
				change_state("wander")

		"stalk":
			if distance > detection_range * 1.2:
				change_state("return")
			elif distance < config.attack_range * TILE_SIZE and attack_cooldown <= 0.0:
				change_state("attack")

		"attack":
			if state_timer > 0.5:
				change_state("stalk")

		"return":
			if global_position.distance_to(spawn_pos) < TILE_SIZE * 2:
				change_state("idle")

func update_territorial_ai(distance: float) -> void:
	var dist_from_territory = global_position.distance_to(territory_center)

	match state:
		"idle", "wander":
			if distance < config.warn_distance * TILE_SIZE and not warned:
				change_state("warn")
			elif state == "idle" and wander_wait_time <= 0.0:
				change_state("wander")

		"warn":
			if distance < config.charge_distance * TILE_SIZE:
				change_state("charge")
			elif distance > config.detection_range * TILE_SIZE:
				warned = false
				change_state("return")

		"charge":
			if distance < config.attack_range * TILE_SIZE and attack_cooldown <= 0.0:
				change_state("attack")
			elif dist_from_territory > config.territory_radius * TILE_SIZE:
				change_state("return")

		"attack":
			if state_timer > 0.5:
				if distance < config.attack_range * TILE_SIZE * 2:
					change_state("charge")
				else:
					change_state("return")

		"return":
			if dist_from_territory < TILE_SIZE * 2:
				warned = false
				change_state("idle")

func update_ambush_ai(distance: float, detection_range: float) -> void:
	match state:
		"idle", "wander":
			if distance < detection_range:
				change_state("stalk")
			elif state == "idle" and wander_wait_time <= 0.0:
				change_state("wander")

		"stalk":
			if distance > detection_range * 1.5:
				first_strike_available = true
				change_state("return")
			elif distance < config.attack_range * TILE_SIZE:
				change_state("attack")

		"attack":
			if state_timer > 0.5:
				if distance < detection_range:
					change_state("stalk")
				else:
					change_state("return")

		"return":
			if global_position.distance_to(spawn_pos) < TILE_SIZE * 2:
				first_strike_available = true
				change_state("idle")

func update_opportunistic_ai(distance: float, detection_range: float) -> void:
	var player_hp = player.get("hp") if player else 100
	var should_attack = player_hp < config.attack_hp_threshold

	match state:
		"idle", "wander":
			if should_attack and distance < detection_range:
				change_state("stalk")
			elif state == "idle" and wander_wait_time <= 0.0:
				change_state("wander")

		"stalk":
			if not should_attack or distance > detection_range * 1.2:
				change_state("return")
			elif distance < config.attack_range * TILE_SIZE and attack_cooldown <= 0.0:
				change_state("attack")

		"attack":
			if state_timer > 0.5:
				if should_attack and distance < detection_range:
					change_state("stalk")
				else:
					change_state("return")

		"return":
			if global_position.distance_to(spawn_pos) < TILE_SIZE * 2:
				change_state("idle")

func execute_state(delta: float) -> void:
	match state:
		"idle":
			velocity = Vector2.ZERO

		"wander":
			execute_wander(delta)

		"flee":
			execute_flee(delta)

		"stalk":
			execute_stalk(delta)

		"charge":
			execute_charge(delta)

		"attack":
			execute_attack()

		"warn":
			execute_warn()

		"return":
			execute_return(delta)

func execute_wander(delta: float) -> void:
	if target_pos.distance_to(global_position) < TILE_SIZE:
		# Pick new wander target
		var angle = randf() * TAU
		var distance = randf_range(TILE_SIZE * 2, WANDER_RADIUS * TILE_SIZE)
		target_pos = spawn_pos + Vector2(cos(angle), sin(angle)) * distance

	move_towards(target_pos, config.speed * 0.5, delta)

func execute_flee(delta: float) -> void:
	if not player:
		return

	# Flee away from player
	var flee_direction = (global_position - player.global_position).normalized()
	target_pos = global_position + flee_direction * TILE_SIZE * 10
	move_towards(target_pos, config.speed, delta)

	# Elk charge behavior
	if config.behavior == "flee_charge" and not is_charging:
		var hp_ratio = float(hp) / float(max_hp)
		if hp_ratio <= config.charge_hp_threshold:
			change_state("charge")

func execute_stalk(delta: float) -> void:
	if not player:
		return

	var stalk_speed = config.get("stalk_speed", config.speed * 0.7)
	move_towards(player.global_position, stalk_speed, delta)

func execute_charge(delta: float) -> void:
	if not player:
		return

	is_charging = true
	move_towards(player.global_position, config.speed * 1.3, delta)

	# Check for collision with player
	if global_position.distance_to(player.global_position) < TILE_SIZE * 1.5:
		if attack_cooldown <= 0.0:
			var damage = config.get("charge_damage", config.get("attack_damage", 10))
			animal_attacked_player.emit(damage, animal_type)
			attack_cooldown = config.get("attack_cooldown", 2.0)

func execute_attack() -> void:
	if not player:
		return

	if attack_cooldown <= 0.0:
		var damage = config.attack_damage

		# Cougar first strike bonus
		if config.behavior == "ambush" and first_strike_available:
			var to_player = (player.global_position - global_position).normalized()
			var player_facing = player.get("facing_direction") if player.has_method("get") else Vector2.DOWN
			var dot = to_player.dot(player_facing)
			if dot > 0.5:  # Behind player
				damage *= config.first_strike_multiplier
				first_strike_available = false

		animal_attacked_player.emit(damage, animal_type)
		attack_cooldown = config.attack_cooldown

	velocity = Vector2.ZERO

func execute_warn() -> void:
	# Stand ground and face player
	velocity = Vector2.ZERO
	warned = true

func execute_return(delta: float) -> void:
	move_towards(spawn_pos, config.speed * 0.6, delta)

func move_towards(target: Vector2, speed: float, delta: float) -> void:
	var direction = (target - global_position).normalized()
	velocity = direction * speed

	# Isometric movement adjustment
	velocity.y *= 0.5

func change_state(new_state: String) -> void:
	state = new_state
	state_timer = 0.0

	match new_state:
		"idle":
			wander_wait_time = randf_range(2.0, 5.0)
		"wander":
			var angle = randf() * TAU
			var distance = randf_range(TILE_SIZE * 2, WANDER_RADIUS * TILE_SIZE)
			target_pos = spawn_pos + Vector2(cos(angle), sin(angle)) * distance
		"charge":
			is_charging = true

func take_damage(damage: int, source: String = "") -> void:
	if is_dead:
		return

	hp -= damage

	if hp <= 0:
		die()
	else:
		# React to damage
		if config.type == "prey":
			change_state("flee")

func die() -> void:
	is_dead = true
	state = "dead"
	velocity = Vector2.ZERO

	# Visual feedback
	if sprite:
		sprite.modulate = Color(0.5, 0.5, 0.5)

	# Disable collision
	if collision:
		collision.set_deferred("disabled", true)

	animal_died.emit(self)

func can_harvest() -> bool:
	return is_dead

func harvest() -> Array:
	var drops = loot_drops.duplicate()
	queue_free()
	return drops

func set_pack_members(members: Array) -> void:
	pack_members = members
