extends Control

@onready var title: Label = $Content/Title
@onready var loading_bar: ProgressBar = $Content/LoadingBar
@onready var status_label: Label = $Content/StatusLabel

func _ready() -> void:
	# Style title
	title.add_theme_font_size_override("font_size", 64)
	title.add_theme_color_override("font_color", Color(0.9, 0.9, 0.9))

	# Start loading
	start_loading()

func start_loading() -> void:
	status_label.text = "Loading..."
	loading_bar.value = 0

	# Simple loading sequence (no TileManager dependency)
	await get_tree().create_timer(0.5).timeout
	loading_bar.value = 50
	status_label.text = "Initializing systems..."

	await get_tree().create_timer(0.5).timeout
	loading_bar.value = 100
	status_label.text = "Complete!"

	# Wait a moment then transition
	await get_tree().create_timer(0.5).timeout
	transition_to_menu()

func transition_to_menu() -> void:
	# Fade out
	var tween = create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.5)
	await tween.finished

	# Change scene
	get_tree().change_scene_to_file("res://scenes/main/menu.tscn")
