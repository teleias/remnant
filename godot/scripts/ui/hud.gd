extends CanvasLayer

# Stat bars
@onready var health_bar: ProgressBar = $TopLeft/HealthBar/Bar
@onready var hunger_bar: ProgressBar = $TopLeft/HungerBar/Bar
@onready var thirst_bar: ProgressBar = $TopLeft/ThirstBar/Bar
@onready var fatigue_bar: ProgressBar = $TopLeft/FatigueBar/Bar

# Time display
@onready var time_label: Label = $TopCenter/TimeLabel
@onready var day_label: Label = $TopCenter/DayLabel
@onready var season_label: Label = $TopCenter/SeasonLabel
@onready var weather_label: Label = $TopCenter/WeatherLabel

# Moodle container
@onready var moodle_container: VBoxContainer = $TopRight/MoodleContainer

# Hotbar
@onready var hotbar_slots: Array = [
	$BottomCenter/Slot1,
	$BottomCenter/Slot2,
	$BottomCenter/Slot3,
	$BottomCenter/Slot4,
	$BottomCenter/Slot5,
	$BottomCenter/Slot6
]

# Interaction
@onready var interaction_label: Label = $CenterBottom/InteractionLabel
@onready var gather_progress_bar: ProgressBar = $CenterBottom/GatherProgressBar

# References
var player: CharacterBody2D
var game_state: Node

# Moodle icons
var active_moodles: Dictionary = {}

func _ready() -> void:
	# Get references
	await get_tree().process_frame
	player = get_tree().get_first_node_in_group("player")
	game_state = get_node("/root/GameState")

	# Style bars
	style_bars()

	# Hide interaction elements initially
	interaction_label.text = ""
	gather_progress_bar.visible = false

func _process(_delta: float) -> void:
	update_stats()
	update_time()
	update_moodles()

func style_bars() -> void:
	# Create bar styles with colors
	var health_style = StyleBoxFlat.new()
	health_style.bg_color = Color(0.8, 0.2, 0.2)
	health_bar.add_theme_stylebox_override("fill", health_style)

	var hunger_style = StyleBoxFlat.new()
	hunger_style.bg_color = Color(0.9, 0.6, 0.2)
	hunger_bar.add_theme_stylebox_override("fill", hunger_style)

	var thirst_style = StyleBoxFlat.new()
	thirst_style.bg_color = Color(0.2, 0.5, 0.9)
	thirst_bar.add_theme_stylebox_override("fill", thirst_style)

	var fatigue_style = StyleBoxFlat.new()
	fatigue_style.bg_color = Color(0.9, 0.9, 0.3)
	fatigue_bar.add_theme_stylebox_override("fill", fatigue_style)

	# Background
	var bg_style = StyleBoxFlat.new()
	bg_style.bg_color = Color(0.1, 0.1, 0.1, 0.7)

	for bar in [health_bar, hunger_bar, thirst_bar, fatigue_bar]:
		bar.add_theme_stylebox_override("background", bg_style)

func update_stats() -> void:
	if not game_state:
		return

	# Update bars from GameState.stats dictionary
	health_bar.value = game_state.stats.health
	health_bar.max_value = 100.0

	hunger_bar.value = game_state.stats.hunger
	thirst_bar.value = game_state.stats.thirst
	fatigue_bar.value = game_state.stats.fatigue

func update_time() -> void:
	if not game_state:
		return

	# Format time (hour is a float, convert to HH:MM AM/PM)
	var hour = game_state.time.hour
	var hours_int = int(hour)
	var minutes_int = int((hour - hours_int) * 60)

	# Convert to 12-hour format with AM/PM
	var am_pm = "AM"
	var display_hour = hours_int
	if hours_int >= 12:
		am_pm = "PM"
		if hours_int > 12:
			display_hour = hours_int - 12
	elif hours_int == 0:
		display_hour = 12

	time_label.text = "%02d:%02d %s" % [display_hour, minutes_int, am_pm]

	# Day
	day_label.text = "Day %d" % game_state.time.day

	# Season
	season_label.text = game_state.time.season.capitalize()

	# Weather
	weather_label.text = game_state.weather.capitalize()

func update_moodles() -> void:
	if not game_state:
		return

	# Get current conditions directly from GameState.conditions array
	var conditions = game_state.conditions

	# Update moodle display
	for child in moodle_container.get_children():
		child.queue_free()

	for condition in conditions:
		var moodle = create_moodle(condition)
		moodle_container.add_child(moodle)

func create_moodle(condition: Dictionary) -> Control:
	var panel = Panel.new()
	panel.custom_minimum_size = Vector2(80, 24)

	# Background
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2

	# Color based on severity
	var severity = condition.get("severity", 1.0)
	if severity >= 3.0:
		style.border_color = Color(0.9, 0.2, 0.2)  # Red
	elif severity >= 2.0:
		style.border_color = Color(0.9, 0.6, 0.2)  # Orange
	else:
		style.border_color = Color(0.9, 0.9, 0.3)  # Yellow

	panel.add_theme_stylebox_override("panel", style)

	var label = Label.new()
	# Use "type" field from GameState condition structure
	label.text = condition.get("type", "Unknown")
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.size_flags_vertical = Control.SIZE_EXPAND_FILL

	panel.add_child(label)

	return panel

func update_hotbar(hotbar_items: Array) -> void:
	for i in range(hotbar_slots.size()):
		var slot = hotbar_slots[i]

		# Clear existing item display
		for child in slot.get_children():
			if child.name != "KeyLabel":
				child.queue_free()

		# Add item if present
		if i < hotbar_items.size() and hotbar_items[i] != null:
			var item = hotbar_items[i]
			var item_label = Label.new()
			item_label.text = item.get("name", "Item")
			item_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			item_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			item_label.offset_top = 14
			item_label.offset_right = 48
			item_label.offset_bottom = 48
			slot.add_child(item_label)

			# Highlight if selected
			if i == get_selected_hotbar_index():
				var style = StyleBoxFlat.new()
				style.bg_color = Color(0.3, 0.3, 0.5, 0.8)
				style.border_color = Color(0.8, 0.8, 1.0)
				style.border_width_left = 2
				style.border_width_right = 2
				style.border_width_top = 2
				style.border_width_bottom = 2
				slot.add_theme_stylebox_override("panel", style)
			else:
				var style = StyleBoxFlat.new()
				style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
				slot.add_theme_stylebox_override("panel", style)

func get_selected_hotbar_index() -> int:
	# Track hotbar selection via input (keys 1-6)
	for i in range(6):
		var action = "hotbar_%d" % (i + 1)
		if Input.is_action_just_pressed(action):
			return i
	return 0

func show_interaction_prompt(text: String) -> void:
	interaction_label.text = text
	interaction_label.visible = true

func hide_interaction_prompt() -> void:
	interaction_label.text = ""
	interaction_label.visible = false

func show_gather_progress(current: float, total: float) -> void:
	gather_progress_bar.visible = true
	gather_progress_bar.max_value = total
	gather_progress_bar.value = current

func hide_gather_progress() -> void:
	gather_progress_bar.visible = false
	gather_progress_bar.value = 0

func update_gather_progress(current: float) -> void:
	gather_progress_bar.value = current

func show_damage_indicator(amount: int) -> void:
	# Create floating damage text
	var damage_label = Label.new()
	damage_label.text = "-%d" % amount
	damage_label.add_theme_color_override("font_color", Color(1, 0.2, 0.2))
	damage_label.z_index = 100

	# Position at top of screen center
	damage_label.position = Vector2(
		get_viewport().size.x / 2 - 50,
		get_viewport().size.y / 4
	)

	add_child(damage_label)

	# Animate
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(damage_label, "position:y", damage_label.position.y - 50, 1.0)
	tween.tween_property(damage_label, "modulate:a", 0.0, 1.0)
	tween.tween_callback(damage_label.queue_free)

func show_notification(text: String, duration: float = 3.0) -> void:
	var notification = Label.new()
	notification.text = text
	notification.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	notification.add_theme_color_override("font_color", Color(1, 1, 1))

	# Background
	var bg = StyleBoxFlat.new()
	bg.bg_color = Color(0.1, 0.1, 0.1, 0.9)
	notification.add_theme_stylebox_override("normal", bg)

	# Position at top center
	notification.position = Vector2(
		get_viewport().size.x / 2 - 150,
		50
	)
	notification.size = Vector2(300, 40)

	add_child(notification)

	# Auto-remove after duration
	await get_tree().create_timer(duration).timeout
	notification.queue_free()
