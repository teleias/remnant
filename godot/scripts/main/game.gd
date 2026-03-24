extends Node2D

# DEFINITIVE GAME.GD - Single source of truth for game scene

# Scene references
@onready var canvas_modulate: CanvasModulate = $CanvasModulate
@onready var world_node: Node2D = $World
@onready var object_container: Node2D = $World/ObjectContainer
@onready var player: CharacterBody2D = $World/ObjectContainer/Player
@onready var ui_layer: CanvasLayer = $UILayer

# Local system instances (NOT autoloads)
var world_generator: WorldGenerator
var tile_manager: TileManager
var time_system: Node
var survival_system: Node

# UI references (loaded dynamically)
var hud: CanvasLayer
var inventory_panel: Panel
var crafting_panel: Panel
var build_panel: Panel
var death_screen: CanvasLayer

# Game state
var game_paused: bool = false
var player_dead: bool = false

const WORLD_SIZE: int = 256

func _ready() -> void:
	print("Game: Initializing...")

	# Get GameState autoload
	var gs = get_node("/root/GameState")
	if not gs:
		push_error("GameState autoload not found!")
		return

	# Reset for new game if needed (menu should do this, but safety check)
	if gs.world_seed == 0:
		gs.reset_for_new_game()

	# Generate world
	print("Game: Generating world with seed ", gs.world_seed)
	world_generator = WorldGenerator.new()
	world_generator.name = "WorldGenerator"
	add_child(world_generator)
	world_generator.generate(gs.world_seed)

	# Build world tiles and objects
	print("Game: Building world tiles and objects...")
	tile_manager = TileManager.new()
	tile_manager.name = "TileManager"
	add_child(tile_manager)
	tile_manager.build_world(world_generator, world_node, object_container)

	# Setup player
	if player:
		print("Game: Setting up player...")
		if player.has_method("set_walkability_grid"):
			player.set_walkability_grid(world_generator.walkability, WORLD_SIZE)
		if player.has_method("set_elevation_grid"):
			player.set_elevation_grid(world_generator.elevation, WORLD_SIZE)
		if player.has_method("teleport_to"):
			player.teleport_to(int(gs.player_grid_x), int(gs.player_grid_y))
		else:
			# Fallback: set position directly
			var spawn_pos = tile_manager.grid_to_screen(int(gs.player_grid_x), int(gs.player_grid_y),
				world_generator.get_elevation(int(gs.player_grid_x), int(gs.player_grid_y)))
			player.global_position = spawn_pos
		# Set camera target for viewport culling
		tile_manager.set_camera_target(player)
	else:
		push_error("Player not found in scene tree!")

	# Load UI scenes
	load_ui_scenes()

	# Initialize time system
	print("Game: Initializing time system...")
	time_system = load("res://scripts/systems/time_system.gd").new()
	time_system.name = "TimeSystem"
	add_child(time_system)
	if time_system.has_method("set_canvas_modulate"):
		time_system.set_canvas_modulate(canvas_modulate)

	# Initialize survival system
	print("Game: Initializing survival system...")
	survival_system = load("res://scripts/systems/survival_system.gd").new()
	survival_system.name = "SurvivalSystem"
	add_child(survival_system)

	# Connect signals
	connect_signals()

	print("Game: Ready!")

func load_ui_scenes() -> void:
	# Load HUD
	var hud_path = "res://scenes/ui/hud.tscn"
	if ResourceLoader.exists(hud_path):
		var hud_scene = load(hud_path)
		if hud_scene:
			hud = hud_scene.instantiate()
			ui_layer.add_child(hud)
			hud.visible = true

	# Load Inventory Panel
	var inv_path = "res://scenes/ui/inventory_panel.tscn"
	if ResourceLoader.exists(inv_path):
		var inv_scene = load(inv_path)
		if inv_scene:
			inventory_panel = inv_scene.instantiate()
			ui_layer.add_child(inventory_panel)
			inventory_panel.visible = false

	# Load Crafting Panel
	var craft_path = "res://scenes/ui/crafting_panel.tscn"
	if ResourceLoader.exists(craft_path):
		var craft_scene = load(craft_path)
		if craft_scene:
			crafting_panel = craft_scene.instantiate()
			ui_layer.add_child(crafting_panel)
			crafting_panel.visible = false

	# Load Death Screen
	var death_path = "res://scenes/ui/death_screen.tscn"
	if ResourceLoader.exists(death_path):
		var death_scene = load(death_path)
		if death_scene:
			death_screen = death_scene.instantiate()
			ui_layer.add_child(death_screen)
			death_screen.visible = false

func connect_signals() -> void:
	var gs = get_node("/root/GameState")
	if gs:
		# Connect player death signal
		if gs.has_signal("player_died"):
			if not gs.player_died.is_connected(_on_player_died):
				gs.player_died.connect(_on_player_died)

func _process(_delta: float) -> void:
	if player_dead:
		return

	# Handle pause (ESC)
	if Input.is_action_just_pressed("ui_cancel"):
		toggle_pause()

func _input(event: InputEvent) -> void:
	if player_dead:
		return

	# Quick save (F5)
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F5:
			quick_save()
		elif event.keycode == KEY_F9:
			quick_load()

	# UI toggles
	if Input.is_action_just_pressed("inventory"):
		toggle_inventory()

	if Input.is_action_just_pressed("crafting"):
		toggle_crafting()

	if Input.is_action_just_pressed("build_mode"):
		toggle_build_mode()

func toggle_pause() -> void:
	game_paused = not game_paused
	get_tree().paused = game_paused

	if game_paused:
		print("GAME PAUSED - Press ESC to resume")
		# TODO: Show pause menu UI
	else:
		print("GAME RESUMED")

func quick_save() -> void:
	var gs = get_node("/root/GameState")
	if gs and gs.has_method("save_game"):
		if gs.save_game("main"):
			print("Game saved!")
			if hud and hud.has_method("show_notification"):
				hud.show_notification("Game Saved", 2.0)
		else:
			print("Save failed!")

func quick_load() -> void:
	var gs = get_node("/root/GameState")
	if gs and gs.has_method("load_game"):
		if gs.load_game("main"):
			print("Game loaded! Reloading scene...")
			get_tree().reload_current_scene()
		else:
			print("Load failed - no save found")

func toggle_inventory() -> void:
	if inventory_panel:
		inventory_panel.visible = not inventory_panel.visible
		# Close other panels
		if inventory_panel.visible:
			if crafting_panel:
				crafting_panel.visible = false
			if build_panel:
				build_panel.visible = false

func toggle_crafting() -> void:
	if crafting_panel:
		crafting_panel.visible = not crafting_panel.visible
		# Close other panels
		if crafting_panel.visible:
			if inventory_panel:
				inventory_panel.visible = false
			if build_panel:
				build_panel.visible = false

func toggle_build_mode() -> void:
	if build_panel:
		build_panel.visible = not build_panel.visible
		# Close other panels
		if build_panel.visible:
			if inventory_panel:
				inventory_panel.visible = false
			if crafting_panel:
				crafting_panel.visible = false

func _on_player_died(cause: String) -> void:
	player_dead = true
	print("Player died: ", cause)

	# Show death screen
	if death_screen:
		if death_screen.has_method("show_death_screen"):
			death_screen.show_death_screen(cause)
		else:
			death_screen.visible = true

	# Disable player input
	if player and player.has_method("set_process"):
		player.set_process(false)
