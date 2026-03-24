extends Panel

# Category buttons
@onready var category_buttons: Dictionary = {
	"all": $CategoryTabs/AllButton,
	"tools": $CategoryTabs/ToolsButton,
	"food": $CategoryTabs/FoodButton,
	"building": $CategoryTabs/BuildingButton,
	"medical": $CategoryTabs/MedicalButton,
	"clothing": $CategoryTabs/ClothingButton
}

# Recipe list
@onready var recipe_container: VBoxContainer = $LeftSide/RecipeList/RecipeContainer

# Recipe detail
@onready var recipe_name: Label = $RightSide/RecipeDetail/RecipeName
@onready var recipe_description: Label = $RightSide/RecipeDetail/RecipeDescription
@onready var inputs_list: VBoxContainer = $RightSide/RecipeDetail/InputsList
@onready var station_label: Label = $RightSide/RecipeDetail/StationLabel
@onready var skill_label: Label = $RightSide/RecipeDetail/SkillLabel
@onready var output_preview: HBoxContainer = $RightSide/RecipeDetail/OutputPreview
@onready var progress_bar: ProgressBar = $RightSide/RecipeDetail/ProgressBar
@onready var craft_button: Button = $RightSide/RecipeDetail/CraftButton

# Status
@onready var status_label: Label = $Bottom/StatusLabel

# State
var current_category: String = "all"
var selected_recipe: Dictionary = {}
var player: CharacterBody2D
var crafting_system: Node
var inventory_system: Node
var game_state: Node

# Recipe database (simplified - should load from data file)
var recipes: Array = []

func _ready() -> void:
	# Hide initially
	visible = false

	# Style panel
	style_panel()

	# Connect category buttons
	for category in category_buttons.keys():
		category_buttons[category].pressed.connect(_on_category_selected.bind(category))

	# Connect craft button
	craft_button.pressed.connect(_on_craft_pressed)

	# Get references
	await get_tree().process_frame
	player = get_tree().get_first_node_in_group("player")
	game_state = get_node("/root/GameState")

	# CraftingSystem and InventorySystem are not player child nodes
	# Use GameState for inventory, crafting uses local recipes
	crafting_system = get_tree().get_first_node_in_group("crafting_system")
	# inventory_system not needed - use game_state directly

	# Load recipes
	load_recipes()

	# Initial display
	refresh_recipe_list()

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("crafting"):
		toggle_panel()

func toggle_panel() -> void:
	visible = !visible
	if visible:
		refresh_recipe_list()

func style_panel() -> void:
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.15, 0.15, 0.15, 0.95)
	style.border_color = Color(0.5, 0.5, 0.5)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2

	add_theme_stylebox_override("panel", style)

	# Style side panels
	for panel in [$LeftSide, $RightSide, $Bottom]:
		var panel_style = StyleBoxFlat.new()
		panel_style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
		panel.add_theme_stylebox_override("panel", panel_style)

func load_recipes() -> void:
	# Load from game state or define here
	recipes = [
		{
			"id": "stone_axe",
			"name": "Stone Axe",
			"category": "tools",
			"description": "A crude axe made from stone and wood.",
			"inputs": [
				{"id": "stone", "count": 3},
				{"id": "stick", "count": 2},
				{"id": "plant_fiber", "count": 2}
			],
			"output": {"id": "stone_axe", "count": 1},
			"station": null,
			"skill_required": {"carpentry": 0},
			"craft_time": 5.0
		},
		{
			"id": "campfire",
			"name": "Campfire",
			"category": "building",
			"description": "A basic campfire for cooking and warmth.",
			"inputs": [
				{"id": "stone", "count": 5},
				{"id": "stick", "count": 10}
			],
			"output": {"id": "campfire", "count": 1},
			"station": null,
			"skill_required": {"carpentry": 1},
			"craft_time": 10.0
		},
		{
			"id": "cooked_meat",
			"name": "Cooked Meat",
			"category": "food",
			"description": "Cooked animal meat. Safer to eat.",
			"inputs": [
				{"id": "raw_meat", "count": 1}
			],
			"output": {"id": "cooked_meat", "count": 1},
			"station": "campfire",
			"skill_required": {"cooking": 0},
			"craft_time": 3.0
		},
		{
			"id": "bandage",
			"name": "Bandage",
			"category": "medical",
			"description": "A basic bandage for treating wounds.",
			"inputs": [
				{"id": "cloth", "count": 2}
			],
			"output": {"id": "bandage", "count": 1},
			"station": null,
			"skill_required": {"first_aid": 0},
			"craft_time": 2.0
		},
		{
			"id": "leather_vest",
			"name": "Leather Vest",
			"category": "clothing",
			"description": "A simple vest made from leather.",
			"inputs": [
				{"id": "leather", "count": 4},
				{"id": "plant_fiber", "count": 3}
			],
			"output": {"id": "leather_vest", "count": 1},
			"station": null,
			"skill_required": {"tailoring": 1},
			"craft_time": 15.0
		}
	]

func refresh_recipe_list() -> void:
	# Clear existing
	for child in recipe_container.get_children():
		child.queue_free()

	# Filter by category
	var filtered_recipes = recipes.filter(
		func(r): return current_category == "all" or r.category == current_category
	)

	# Display recipes
	for recipe in filtered_recipes:
		var recipe_button = create_recipe_button(recipe)
		recipe_container.add_child(recipe_button)

func create_recipe_button(recipe: Dictionary) -> Button:
	var button = Button.new()
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT

	# Check if craftable
	var can_craft = check_can_craft(recipe)

	# Set text and color
	var text = recipe.name
	if can_craft:
		button.modulate = Color(0.8, 1.0, 0.8)
		text = "✓ " + text
	else:
		button.modulate = Color(0.6, 0.6, 0.6)

	button.text = text

	# Connect pressed
	button.pressed.connect(_on_recipe_selected.bind(recipe))

	return button

func check_can_craft(recipe: Dictionary) -> bool:
	if not game_state:
		return false

	# Check inputs against GameState inventory
	for input_item in recipe.inputs:
		if not game_state.has_item(input_item.id, input_item.count):
			return false

	# Check station
	if recipe.station != null:
		if not is_near_station(recipe.station):
			return false

	# Check skill
	if recipe.skill_required:
		for skill_name in recipe.skill_required.keys():
			var required_level = recipe.skill_required[skill_name]
			var player_level = get_skill_level(skill_name)
			if player_level < required_level:
				return false

	return true

func is_near_station(station_type: String) -> bool:
	# Check if player is near required crafting station
	if crafting_system and crafting_system.has_method("is_near_station"):
		return crafting_system.is_near_station(station_type)
	return false

func get_skill_level(skill_name: String) -> int:
	if game_state and "skills" in game_state:
		# GameState.skills is a Dictionary with {level, xp} structure
		var skill_data = game_state.skills.get(skill_name, {"level": 0, "xp": 0})
		if skill_data is Dictionary:
			return skill_data.get("level", 0)
		return 0
	return 0

func _on_category_selected(category: String) -> void:
	current_category = category

	# Update button states
	for cat in category_buttons.keys():
		if cat == category:
			category_buttons[cat].disabled = true
		else:
			category_buttons[cat].disabled = false

	refresh_recipe_list()

func _on_recipe_selected(recipe: Dictionary) -> void:
	selected_recipe = recipe
	display_recipe_detail(recipe)

func display_recipe_detail(recipe: Dictionary) -> void:
	# Name and description
	recipe_name.text = recipe.name
	recipe_description.text = recipe.description

	# Clear inputs list
	for child in inputs_list.get_children():
		child.queue_free()

	# Display inputs
	for input in recipe.inputs:
		var input_label = Label.new()
		var have_count = 0
		if game_state:
			for slot in game_state.inventory.slots:
				if slot != null and slot.item_id == input.id:
					have_count += slot.get("quantity", 1)

		var color = Color.GREEN if have_count >= input.count else Color.RED
		input_label.text = "  %s: %d / %d" % [input.id, have_count, input.count]
		input_label.add_theme_color_override("font_color", color)
		inputs_list.add_child(input_label)

	# Station requirement
	if recipe.station:
		var near = is_near_station(recipe.station)
		var color = Color.GREEN if near else Color.RED
		station_label.text = "Station: %s %s" % [recipe.station, "✓" if near else "✗"]
		station_label.add_theme_color_override("font_color", color)
	else:
		station_label.text = "Station: None (craft anywhere)"

	# Skill requirement
	if recipe.skill_required and recipe.skill_required.size() > 0:
		var skill_text = "Skill: "
		var all_met = true
		for skill_name in recipe.skill_required.keys():
			var required = recipe.skill_required[skill_name]
			var current = get_skill_level(skill_name)
			skill_text += "%s %d/%d " % [skill_name, current, required]
			if current < required:
				all_met = false
		skill_label.text = skill_text
		skill_label.add_theme_color_override("font_color", Color.GREEN if all_met else Color.RED)
	else:
		skill_label.text = "Skill: None required"

	# Output
	for child in output_preview.get_children():
		child.queue_free()

	var output_label = Label.new()
	output_label.text = "%s x%d" % [recipe.output.id, recipe.output.count]
	output_preview.add_child(output_label)

	# Craft button
	var can_craft = check_can_craft(recipe)
	craft_button.disabled = !can_craft

	if can_craft:
		status_label.text = "Ready to craft"
		status_label.add_theme_color_override("font_color", Color.GREEN)
	else:
		status_label.text = "Missing requirements"
		status_label.add_theme_color_override("font_color", Color.RED)

func _on_craft_pressed() -> void:
	if selected_recipe.is_empty():
		return

	if not crafting_system:
		return

	# Start crafting
	if crafting_system.has_method("start_craft"):
		crafting_system.start_craft(selected_recipe)
		show_crafting_progress()
	else:
		# Immediate craft
		craft_immediate()

func craft_immediate() -> void:
	if not game_state:
		return

	# Remove inputs via GameState
	for input_item in selected_recipe.inputs:
		game_state.remove_item(input_item.id, input_item.count)

	# Add output via GameState
	game_state.add_item(selected_recipe.output.id, selected_recipe.output.count)

	# Refresh
	refresh_recipe_list()
	display_recipe_detail(selected_recipe)

	status_label.text = "Crafted %s!" % selected_recipe.name

func show_crafting_progress() -> void:
	progress_bar.visible = true
	craft_button.disabled = true

	# Connect to crafting system progress
	if crafting_system.has_signal("craft_progress"):
		if not crafting_system.craft_progress.is_connected(_on_craft_progress):
			crafting_system.craft_progress.connect(_on_craft_progress)

	if crafting_system.has_signal("craft_completed"):
		if not crafting_system.craft_completed.is_connected(_on_craft_completed):
			crafting_system.craft_completed.connect(_on_craft_completed)

func _on_craft_progress(progress: float, total: float) -> void:
	progress_bar.max_value = total
	progress_bar.value = progress
	status_label.text = "Crafting... %.0f%%" % ((progress / total) * 100)

func _on_craft_completed(success: bool) -> void:
	progress_bar.visible = false
	craft_button.disabled = false

	if success:
		status_label.text = "Crafted %s!" % selected_recipe.name
		refresh_recipe_list()
		display_recipe_detail(selected_recipe)
	else:
		status_label.text = "Crafting failed!"
