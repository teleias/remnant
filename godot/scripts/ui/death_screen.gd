extends CanvasLayer

@onready var title: Label = $Content/Title
@onready var cause_label: Label = $Content/CauseLabel
@onready var day_survived_label: Label = $Content/DaySurvivedLabel
@onready var time_played_label: Label = $Content/TimePlayedLabel
@onready var animals_killed_label: Label = $Content/AnimalsKilledLabel
@onready var restart_button: Button = $Content/RestartButton
@onready var main_menu_button: Button = $Content/MainMenuButton

var game_state: Node

func _ready() -> void:
	# Hide initially
	visible = false

	# Style
	style_screen()

	# Connect buttons
	restart_button.pressed.connect(_on_restart_pressed)
	main_menu_button.pressed.connect(_on_main_menu_pressed)

	# Get references
	game_state = get_node("/root/GameState")

func style_screen() -> void:
	# Title styling
	title.add_theme_font_size_override("font_size", 48)
	title.add_theme_color_override("font_color", Color(0.9, 0.2, 0.2))

	# Button styling
	for button in [restart_button, main_menu_button]:
		var style = StyleBoxFlat.new()
		style.bg_color = Color(0.3, 0.3, 0.3, 0.9)
		style.border_color = Color(0.6, 0.6, 0.6)
		style.border_width_left = 2
		style.border_width_right = 2
		style.border_width_top = 2
		style.border_width_bottom = 2

		button.add_theme_stylebox_override("normal", style)

		var hover_style = StyleBoxFlat.new()
		hover_style.bg_color = Color(0.4, 0.4, 0.4, 0.9)
		hover_style.border_color = Color(0.8, 0.8, 0.8)
		hover_style.border_width_left = 2
		hover_style.border_width_right = 2
		hover_style.border_width_top = 2
		hover_style.border_width_bottom = 2

		button.add_theme_stylebox_override("hover", hover_style)

func show_death_screen(cause: String) -> void:
	visible = true

	# Set cause
	cause_label.text = "Cause: %s" % cause

	# Set stats
	if game_state:
		# Use correct GameState.time.day property
		day_survived_label.text = "Days Survived: %d" % game_state.time.day

		# Use correct GameState.total_play_time property
		var total_minutes = int(game_state.total_play_time / 60.0)
		var hours = int(total_minutes / 60)
		var minutes = total_minutes % 60
		time_played_label.text = "Time Played: %dh %dm" % [hours, minutes]

		animals_killed_label.text = "Animals Killed: %d" % game_state.animals_killed

func _on_restart_pressed() -> void:
	# Reset game state
	if game_state and game_state.has_method("reset_for_new_game"):
		game_state.reset_for_new_game()

	# Reload game scene
	get_tree().change_scene_to_file("res://scenes/main/game.tscn")

func _on_main_menu_pressed() -> void:
	# Return to main menu
	get_tree().change_scene_to_file("res://scenes/main/menu.tscn")
