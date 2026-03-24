extends Node

# Time constants (60 real seconds = 1 game hour)
const SECONDS_PER_HOUR = 60.0
const HOURS_PER_DAY = 24.0
const DAYS_PER_SEASON = 30

# Day phases
enum DayPhase { NIGHT, DAWN, DAY, DUSK }

# References
var canvas_modulate: CanvasModulate = null

# Time colors
var color_night = Color(0.2, 0.25, 0.4, 1.0)
var color_dawn = Color(0.8, 0.6, 0.5, 1.0)
var color_day = Color(1.0, 1.0, 1.0, 1.0)
var color_dusk = Color(0.9, 0.6, 0.4, 1.0)

# Current state
var current_phase: DayPhase = DayPhase.DAY

func _ready():
	add_to_group("time_system")
	set_process(true)

func _process(delta: float):
	var gs = get_node("/root/GameState")
	if not gs:
		return

	# Update game time
	var hour_delta = delta / SECONDS_PER_HOUR
	gs.time.hour += hour_delta
	gs.total_play_time += delta

	# Handle day rollover
	if gs.time.hour >= HOURS_PER_DAY:
		gs.time.hour -= HOURS_PER_DAY
		gs.time.day += 1

		# Handle season change
		var day_in_season = (gs.time.day - 1) % DAYS_PER_SEASON
		if day_in_season == 0:
			advance_season(gs)

	# Update day/night cycle
	update_lighting(gs)

	# Emit time changed signal
	gs.time_changed.emit(gs.time.hour, gs.time.day, gs.time.season)

func update_lighting(gs):
	if not canvas_modulate:
		return

	var hour = gs.time.hour
	var target_color = color_day
	var new_phase = DayPhase.DAY

	# Determine phase and color
	if hour >= 20.0 or hour < 5.0:
		# Night (8 PM to 5 AM)
		target_color = color_night
		new_phase = DayPhase.NIGHT
	elif hour >= 5.0 and hour < 7.0:
		# Dawn (5 AM to 7 AM)
		var t = (hour - 5.0) / 2.0
		target_color = color_night.lerp(color_dawn, t)
		new_phase = DayPhase.DAWN
	elif hour >= 7.0 and hour < 18.0:
		# Day (7 AM to 6 PM)
		if hour >= 7.0 and hour < 9.0:
			# Dawn to day transition
			var t = (hour - 7.0) / 2.0
			target_color = color_dawn.lerp(color_day, t)
		else:
			target_color = color_day
		new_phase = DayPhase.DAY
	elif hour >= 18.0 and hour < 20.0:
		# Dusk (6 PM to 8 PM)
		var t = (hour - 18.0) / 2.0
		target_color = color_day.lerp(color_dusk, t * 0.5).lerp(color_night, t * 0.5)
		new_phase = DayPhase.DUSK

	# Smooth transition
	canvas_modulate.color = canvas_modulate.color.lerp(target_color, 0.02)
	current_phase = new_phase

func advance_season(gs):
	var seasons = ["spring", "summer", "autumn", "winter"]
	var current_idx = seasons.find(gs.time.season)
	var next_idx = (current_idx + 1) % seasons.size()
	gs.time.season = seasons[next_idx]
	print("Season changed to: ", gs.time.season)

func set_canvas_modulate(modulate_node: CanvasModulate):
	canvas_modulate = modulate_node

func get_time_string() -> String:
	var gs = get_node("/root/GameState")
	if not gs:
		return "00:00"

	var hour = int(gs.time.hour)
	var minute = int((gs.time.hour - hour) * 60)
	var am_pm = "AM"
	var display_hour = hour

	if hour >= 12:
		am_pm = "PM"
		if hour > 12:
			display_hour = hour - 12
	elif hour == 0:
		display_hour = 12

	return "%02d:%02d %s" % [display_hour, minute, am_pm]

func get_day_string() -> String:
	var gs = get_node("/root/GameState")
	if not gs:
		return "Day 1"

	return "Day %d - %s" % [gs.time.day, gs.time.season.capitalize()]

func is_night() -> bool:
	return current_phase == DayPhase.NIGHT

func is_day() -> bool:
	return current_phase == DayPhase.DAY

func get_light_level() -> float:
	# Returns 0.0 (pitch black) to 1.0 (full daylight)
	match current_phase:
		DayPhase.NIGHT:
			return 0.2
		DayPhase.DAWN:
			return 0.6
		DayPhase.DAY:
			return 1.0
		DayPhase.DUSK:
			return 0.5
		_:
			return 1.0
