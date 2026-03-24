extends Panel

# Equipment slots
@onready var equipment_slots: Dictionary = {
	"head": $LeftSide/HeadSlot,
	"torso": $LeftSide/TorsoSlot,
	"legs": $LeftSide/LegsSlot,
	"feet": $LeftSide/FeetSlot,
	"hands": $LeftSide/HandsSlot,
	"back": $LeftSide/BackSlot,
	"main_hand": $LeftSide/MainHandSlot,
	"off_hand": $LeftSide/OffHandSlot
}

# Inventory grid
@onready var inventory_grid: GridContainer = $RightSide/InventoryGrid

# Weight display
@onready var weight_bar: ProgressBar = $Bottom/WeightBar
@onready var weight_label: Label = $Bottom/WeightLabel

# Context menu
@onready var context_menu: PopupMenu = $ContextMenu

# Tooltip
@onready var tooltip: Panel = $Tooltip
@onready var tooltip_name: Label = $Tooltip/TooltipContent/ItemName
@onready var tooltip_condition: ProgressBar = $Tooltip/TooltipContent/ConditionBar
@onready var tooltip_description: Label = $Tooltip/TooltipContent/Description

# Constants
const INVENTORY_SLOTS: int = 20
const SLOT_SIZE: int = 48

# State
var inventory_slots: Array = []
var player: CharacterBody2D
var game_state: Node
var selected_slot: Control = null
var hovered_item: Dictionary = {}

func _ready() -> void:
	# Hide initially
	visible = false

	# Create inventory slots
	create_inventory_slots()

	# Setup context menu
	setup_context_menu()

	# Style panel
	style_panel()

	# Get references
	await get_tree().process_frame
	player = get_tree().get_first_node_in_group("player")
	game_state = get_node("/root/GameState")

	# Connect to GameState inventory changes
	if game_state and game_state.has_signal("inventory_changed"):
		game_state.inventory_changed.connect(refresh_display)

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("inventory"):
		toggle_inventory()

func toggle_inventory() -> void:
	visible = !visible
	if visible:
		refresh_display()

func create_inventory_slots() -> void:
	for i in range(INVENTORY_SLOTS):
		var slot = create_slot()
		slot.set_meta("slot_index", i)
		slot.gui_input.connect(_on_inventory_slot_input.bind(slot))
		slot.mouse_entered.connect(_on_slot_mouse_entered.bind(slot))
		slot.mouse_exited.connect(_on_slot_mouse_exited)
		inventory_grid.add_child(slot)
		inventory_slots.append(slot)

func create_slot() -> Panel:
	var slot = Panel.new()
	slot.custom_minimum_size = Vector2(SLOT_SIZE, SLOT_SIZE)

	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
	style.border_color = Color(0.4, 0.4, 0.4)
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1

	slot.add_theme_stylebox_override("panel", style)

	return slot

func setup_context_menu() -> void:
	context_menu.clear()
	context_menu.add_item("Use", 0)
	context_menu.add_item("Equip", 1)
	context_menu.add_item("Drop", 2)
	context_menu.add_separator()
	context_menu.add_item("Assign to Hotbar", 3)

	context_menu.id_pressed.connect(_on_context_menu_selected)

func style_panel() -> void:
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.15, 0.15, 0.15, 0.95)
	style.border_color = Color(0.5, 0.5, 0.5)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2

	add_theme_stylebox_override("panel", style)

	# Style equipment slots
	for slot in equipment_slots.values():
		var slot_style = StyleBoxFlat.new()
		slot_style.bg_color = Color(0.25, 0.25, 0.25, 0.8)
		slot_style.border_color = Color(0.4, 0.4, 0.4)
		slot_style.border_width_left = 1
		slot_style.border_width_right = 1
		slot_style.border_width_top = 1
		slot_style.border_width_bottom = 1
		slot.add_theme_stylebox_override("panel", slot_style)

		# Connect input
		slot.gui_input.connect(_on_equipment_slot_input.bind(slot))

func refresh_display() -> void:
	if not game_state:
		return

	# Update inventory slots from GameState.inventory.slots
	var items = game_state.inventory.slots

	for i in range(inventory_slots.size()):
		var slot = inventory_slots[i]

		# Clear slot
		for child in slot.get_children():
			child.queue_free()

		# Add item if present
		if i < items.size() and items[i] != null:
			display_item_in_slot(slot, items[i])

	# Update equipment from GameState.inventory.equipped
	var equipped = game_state.inventory.equipped

	for slot_name in equipment_slots.keys():
		var slot = equipment_slots[slot_name]

		# Clear slot
		for child in slot.get_children():
			if child.name != "Label":
				child.queue_free()

		# Add item if equipped
		if slot_name in equipped and equipped[slot_name] != null:
			display_item_in_slot(slot, equipped[slot_name])

	# Update weight
	update_weight_display()

func display_item_in_slot(slot: Panel, item: Dictionary) -> void:
	var container = VBoxContainer.new()
	container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	container.size_flags_vertical = Control.SIZE_EXPAND_FILL

	# Item icon (placeholder)
	var icon = ColorRect.new()
	icon.custom_minimum_size = Vector2(32, 32)
	icon.color = get_item_color(item)
	container.add_child(icon)

	# Item name (abbreviated)
	var name_label = Label.new()
	name_label.text = item.get("name", "Item").substr(0, 6)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 8)
	container.add_child(name_label)

	# Count (if stackable)
	if item.get("count", 1) > 1:
		var count_label = Label.new()
		count_label.text = "x%d" % item.count
		count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		count_label.add_theme_font_size_override("font_size", 8)
		container.add_child(count_label)

	slot.add_child(container)

	# Store item data
	slot.set_meta("item", item)

func get_item_color(item: Dictionary) -> Color:
	var item_type = item.get("type", "misc")

	match item_type:
		"weapon":
			return Color(0.8, 0.3, 0.3)
		"tool":
			return Color(0.6, 0.6, 0.3)
		"food":
			return Color(0.3, 0.8, 0.3)
		"material":
			return Color(0.5, 0.5, 0.5)
		"clothing":
			return Color(0.4, 0.4, 0.8)
		_:
			return Color(0.6, 0.6, 0.6)

func update_weight_display() -> void:
	if not game_state:
		return

	# Calculate weight from inventory items
	var current_weight = 0.0
	var item_db = get_node_or_null("/root/ItemDatabase")
	if item_db:
		for slot in game_state.inventory.slots:
			if slot != null:
				var item_def = item_db.get_item(slot.item_id) if item_db.has_method("get_item") else {}
				current_weight += item_def.get("weight", 0.5) * slot.get("quantity", 1)
	var max_weight = 15.0  # 15kg base capacity

	weight_bar.max_value = max_weight
	weight_bar.value = current_weight
	weight_label.text = "Weight: %.1f / %.1f kg" % [current_weight, max_weight]

	# Color based on weight
	var style = StyleBoxFlat.new()
	if current_weight > max_weight * 0.9:
		style.bg_color = Color(0.9, 0.2, 0.2)
	elif current_weight > max_weight * 0.7:
		style.bg_color = Color(0.9, 0.6, 0.2)
	else:
		style.bg_color = Color(0.3, 0.7, 0.3)

	weight_bar.add_theme_stylebox_override("fill", style)

func _on_inventory_slot_input(event: InputEvent, slot: Panel) -> void:
	if event is InputEventMouseButton and event.pressed:
		var item = slot.get_meta("item", null)
		if item == null:
			return

		match event.button_index:
			MOUSE_BUTTON_LEFT:
				# Select slot
				select_slot(slot)

			MOUSE_BUTTON_RIGHT:
				# Show context menu
				selected_slot = slot
				context_menu.position = get_global_mouse_position()
				context_menu.popup()

func _on_equipment_slot_input(event: InputEvent, slot: Panel) -> void:
	if event is InputEventMouseButton and event.pressed:
		var item = slot.get_meta("item", null)

		match event.button_index:
			MOUSE_BUTTON_LEFT:
				if item:
					# Unequip - move item from equipped slot back to inventory
					var eq_slot_name = get_equipment_slot_name(slot)
					if game_state and eq_slot_name != "":
						var equipped_item = game_state.inventory.equipped.get(eq_slot_name)
						if equipped_item:
							game_state.add_item(equipped_item.item_id, 1, equipped_item.get("condition", 100.0))
							game_state.inventory.equipped[eq_slot_name] = null
							refresh_display()

			MOUSE_BUTTON_RIGHT:
				if item:
					selected_slot = slot
					context_menu.position = get_global_mouse_position()
					context_menu.popup()

func get_equipment_slot_name(slot: Panel) -> String:
	for slot_name in equipment_slots.keys():
		if equipment_slots[slot_name] == slot:
			return slot_name
	return ""

func select_slot(slot: Panel) -> void:
	# Deselect previous
	if selected_slot:
		var style = StyleBoxFlat.new()
		style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
		style.border_color = Color(0.4, 0.4, 0.4)
		style.border_width_left = 1
		style.border_width_right = 1
		style.border_width_top = 1
		style.border_width_bottom = 1
		selected_slot.add_theme_stylebox_override("panel", style)

	# Select new
	selected_slot = slot
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.3, 0.3, 0.5, 0.8)
	style.border_color = Color(0.8, 0.8, 1.0)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	slot.add_theme_stylebox_override("panel", style)

func _on_context_menu_selected(id: int) -> void:
	if not selected_slot or not game_state:
		return

	var item = selected_slot.get_meta("item", null)
	if item == null:
		return

	match id:
		0:  # Use - consume food/medical items
			var item_id = item.get("item_id", "")
			if item_id != "":
				game_state.remove_item(item_id, 1)
				refresh_display()

		1:  # Equip - move to equipment slot
			var item_id = item.get("item_id", "")
			var item_db = get_node_or_null("/root/ItemDatabase")
			if item_db and item_db.has_method("get_item"):
				var item_def = item_db.get_item(item_id)
				var eq_slot = item_def.get("equip_slot", "")
				if eq_slot != "" and eq_slot in game_state.inventory.equipped:
					game_state.inventory.equipped[eq_slot] = item.duplicate()
					game_state.remove_item(item_id, 1)
					refresh_display()

		2:  # Drop
			var item_id = item.get("item_id", "")
			if item_id != "":
				game_state.remove_item(item_id, 1)
				refresh_display()

		3:  # Assign to hotbar
			show_hotbar_assignment_dialog(item)

func show_hotbar_assignment_dialog(item: Dictionary) -> void:
	if not game_state:
		return
	# Assign to first empty hotbar slot
	for i in range(game_state.inventory.hotbar.size()):
		if game_state.inventory.hotbar[i] == null:
			game_state.inventory.hotbar[i] = item.get("item_id", "")
			break

func _on_slot_mouse_entered(slot: Panel) -> void:
	var item = slot.get_meta("item", null)
	if item:
		show_tooltip(item, slot)

func _on_slot_mouse_exited() -> void:
	hide_tooltip()

func show_tooltip(item: Dictionary, slot: Panel) -> void:
	tooltip_name.text = item.get("name", "Unknown")
	tooltip_condition.value = item.get("condition", 100)
	tooltip_description.text = item.get("description", "No description.")

	# Position tooltip
	tooltip.position = slot.global_position + Vector2(SLOT_SIZE + 10, 0)
	tooltip.visible = true

func hide_tooltip() -> void:
	tooltip.visible = false
