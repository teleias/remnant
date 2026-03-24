extends Control

@onready var title: Label = $Content/Title
@onready var new_game_button: Button = $Content/NewGameButton
@onready var continue_button: Button = $Content/ContinueButton
@onready var controls_button: Button = $Content/ControlsButton
@onready var quit_button: Button = $Content/QuitButton
@onready var controls_overlay: Panel = $ControlsOverlay
@onready var close_controls_button: Button = $ControlsOverlay/ControlsContent/CloseButton

var save_manager: Node

func _ready() -> void:
	# Style title
	title.add_theme_font_size_override("font_size", 64)
	title.add_theme_color_override("font_color", Color(0.85, 0.8, 0.7))

	# Connect buttons
	new_game_button.pressed.connect(_on_new_game_pressed)
	continue_button.pressed.connect(_on_continue_pressed)
	controls_button.pressed.connect(_on_controls_pressed)
	quit_button.pressed.connect(_on_quit_pressed)
	close_controls_button.pressed.connect(_on_close_controls_pressed)

	# Get save manager
	save_manager = get_node("/root/SaveManager")

	# Check if save exists
	if save_manager and save_manager.has_method("get_save_slots"):
		var slots = save_manager.get_save_slots()
		continue_button.disabled = slots.size() == 0
	else:
		continue_button.disabled = true

	# Style buttons
	style_buttons()

	# Style overlay
	style_overlay()

func style_buttons() -> void:
	for button in [new_game_button, continue_button, controls_button, quit_button]:
		var style = StyleBoxFlat.new()
		style.bg_color = Color(0.2, 0.25, 0.2, 0.8)
		style.border_color = Color(0.4, 0.5, 0.4)
		style.border_width_left = 2
		style.border_width_right = 2
		style.border_width_top = 2
		style.border_width_bottom = 2

		button.add_theme_stylebox_override("normal", style)

		var hover_style = StyleBoxFlat.new()
		hover_style.bg_color = Color(0.3, 0.35, 0.3, 0.9)
		hover_style.border_color = Color(0.6, 0.7, 0.6)
		hover_style.border_width_left = 2
		hover_style.border_width_right = 2
		hover_style.border_width_top = 2
		hover_style.border_width_bottom = 2

		button.add_theme_stylebox_override("hover", hover_style)

		var pressed_style = StyleBoxFlat.new()
		pressed_style.bg_color = Color(0.15, 0.2, 0.15, 0.9)
		pressed_style.border_color = Color(0.5, 0.6, 0.5)
		pressed_style.border_width_left = 2
		pressed_style.border_width_right = 2
		pressed_style.border_width_top = 2
		pressed_style.border_width_bottom = 2

		button.add_theme_stylebox_override("pressed", pressed_style)

func style_overlay() -> void:
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.1, 0.95)
	style.border_color = Color(0.5, 0.5, 0.5)
	style.border_width_left = 3
	style.border_width_right = 3
	style.border_width_top = 3
	style.border_width_bottom = 3

	controls_overlay.add_theme_stylebox_override("panel", style)

func _on_new_game_pressed() -> void:
	# Initialize new game state
	var game_state = get_node("/root/GameState")
	if game_state and game_state.has_method("reset_for_new_game"):
		game_state.reset_for_new_game()

	# Start game
	get_tree().change_scene_to_file("res://scenes/main/game.tscn")

func _on_continue_pressed() -> void:
	if not save_manager:
		return

	# Load auto-save
	if save_manager.has_method("load_game"):
		var success = await save_manager.load_game("auto")
		if success:
			get_tree().change_scene_to_file("res://scenes/main/game.tscn")
		else:
			push_error("Failed to load save")

func _on_controls_pressed() -> void:
	controls_overlay.visible = true

func _on_close_controls_pressed() -> void:
	controls_overlay.visible = false

func _on_quit_pressed() -> void:
	get_tree().quit()
