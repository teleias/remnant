extends Node

signal inventory_changed
signal item_equipped(slot: String, item_id: String)
signal item_unequipped(slot: String)
signal hotbar_changed(slot_index: int)

const MAX_SLOTS = 20
const BASE_MAX_WEIGHT = 15000 # grams

var slots: Array = []
var equipped: Dictionary = {} # {slot_name: {item_id, slot_index}}
var hotbar: Array = [] # 10 slots, stores inventory slot indices or -1

var item_db: Node

func _ready():
	item_db = get_node("/root/ItemDatabase")
	_initialize_inventory()

func _initialize_inventory():
	slots.clear()
	for i in range(MAX_SLOTS):
		slots.append(null)

	equipped.clear()
	hotbar.clear()
	for i in range(10):
		hotbar.append(-1)

# ===== CORE INVENTORY FUNCTIONS =====

func add_item(item_id: String, quantity: int = 1) -> bool:
	var item_data = item_db.get_item(item_id)
	if item_data.is_empty():
		print("Item not found: ", item_id)
		return false

	var max_stack = item_data.get("stack", 1)
	var remaining = quantity

	# First, try to stack with existing items
	for i in range(MAX_SLOTS):
		if slots[i] == null:
			continue

		if slots[i].id == item_id:
			var current_qty = slots[i].qty
			if current_qty < max_stack:
				var space_available = max_stack - current_qty
				var to_add = min(remaining, space_available)
				slots[i].qty += to_add
				remaining -= to_add

				if remaining <= 0:
					inventory_changed.emit()
					return true

	# If still have remaining, create new stacks
	while remaining > 0:
		var empty_slot = _find_empty_slot()
		if empty_slot == -1:
			print("Inventory full")
			return false

		var to_add = min(remaining, max_stack)

		# Check weight limit
		var item_weight = item_data.get("weight", 0)
		var total_weight_to_add = item_weight * to_add
		if get_total_weight() + total_weight_to_add > get_max_weight():
			print("Too heavy to carry")
			return false

		# Create item instance
		var item_instance = {
			"id": item_id,
			"qty": to_add
		}

		# Copy condition if item has it
		if item_data.has("condition"):
			item_instance["condition"] = item_data.condition

		slots[empty_slot] = item_instance
		remaining -= to_add

	inventory_changed.emit()
	return true

func remove_item(item_id: String, quantity: int = 1) -> bool:
	var remaining = quantity

	for i in range(MAX_SLOTS):
		if slots[i] == null:
			continue

		if slots[i].id == item_id:
			if slots[i].qty >= remaining:
				slots[i].qty -= remaining
				if slots[i].qty <= 0:
					slots[i] = null
					_clear_hotbar_slot_if_linked(i)
				remaining = 0
				break
			else:
				remaining -= slots[i].qty
				slots[i] = null
				_clear_hotbar_slot_if_linked(i)

	if remaining > 0:
		print("Not enough items to remove: ", item_id)
		return false

	inventory_changed.emit()
	return true

func has_item(item_id: String, quantity: int = 1) -> bool:
	return count_item(item_id) >= quantity

func count_item(item_id: String) -> int:
	var total = 0
	for slot in slots:
		if slot != null and slot.id == item_id:
			total += slot.qty
	return total

func get_item_at_slot(slot_index: int) -> Dictionary:
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return {}

	if slots[slot_index] == null:
		return {}

	var item = slots[slot_index]
	var item_data = item_db.get_item(item.id).duplicate()
	item_data["qty"] = item.qty
	if item.has("condition"):
		item_data["condition"] = item.condition

	return item_data

func find_slot_with_item(item_id: String) -> int:
	for i in range(MAX_SLOTS):
		if slots[i] != null and slots[i].id == item_id:
			return i
	return -1

func _find_empty_slot() -> int:
	for i in range(MAX_SLOTS):
		if slots[i] == null:
			return i
	return -1

# ===== WEIGHT MANAGEMENT =====

func get_total_weight() -> float:
	var total = 0.0
	for slot in slots:
		if slot != null:
			var item_data = item_db.get_item(slot.id)
			var weight = item_data.get("weight", 0)
			total += weight * slot.qty

	# Add equipped item weight
	for equip_slot in equipped:
		var equip_data = equipped[equip_slot]
		var slot_index = equip_data.slot_index
		if slot_index >= 0 and slot_index < MAX_SLOTS and slots[slot_index] != null:
			var item_data = item_db.get_item(slots[slot_index].id)
			var weight = item_data.get("weight", 0)
			total += weight

	return total

func get_max_weight() -> float:
	var max_weight = BASE_MAX_WEIGHT

	# Add container bonuses from equipped items
	for equip_slot in equipped:
		var equip_data = equipped[equip_slot]
		var slot_index = equip_data.slot_index
		if slot_index >= 0 and slot_index < MAX_SLOTS and slots[slot_index] != null:
			var item_data = item_db.get_item(slots[slot_index].id)
			if item_data.has("capacity_bonus"):
				max_weight += item_data.capacity_bonus

	return max_weight

# ===== EQUIPMENT =====

func equip_item(slot_index: int, equip_slot: String) -> bool:
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return false

	if slots[slot_index] == null:
		return false

	var item_data = item_db.get_item(slots[slot_index].id)

	# Verify item can be equipped in this slot
	var item_slot = item_data.get("slot", "")
	if item_slot == "":
		print("Item cannot be equipped")
		return false

	if item_slot != equip_slot:
		print("Item cannot be equipped in slot: ", equip_slot)
		return false

	# Unequip existing item in this slot
	if equipped.has(equip_slot):
		unequip_item(equip_slot)

	# Equip new item
	equipped[equip_slot] = {
		"item_id": slots[slot_index].id,
		"slot_index": slot_index
	}

	item_equipped.emit(equip_slot, slots[slot_index].id)
	inventory_changed.emit()
	return true

func unequip_item(equip_slot: String) -> bool:
	if not equipped.has(equip_slot):
		return false

	equipped.erase(equip_slot)
	item_unequipped.emit(equip_slot)
	inventory_changed.emit()
	return true

func get_equipped_item(equip_slot: String) -> Dictionary:
	if not equipped.has(equip_slot):
		return {}

	var slot_index = equipped[equip_slot].slot_index
	return get_item_at_slot(slot_index)

func get_equipped_weapon() -> Dictionary:
	# Check primary weapon slot first
	if equipped.has("weapon"):
		return get_equipped_item("weapon")

	# Check if tool can be used as weapon
	if equipped.has("hands"):
		var tool = get_equipped_item("hands")
		if tool.has("damage"):
			return tool

	return {}

# ===== DURABILITY =====

func degrade_item(slot_index: int, amount: int) -> bool:
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return false

	if slots[slot_index] == null:
		return false

	if not slots[slot_index].has("condition"):
		return false

	slots[slot_index].condition -= amount

	if slots[slot_index].condition <= 0:
		print("Item broken: ", slots[slot_index].id)
		slots[slot_index] = null
		_clear_hotbar_slot_if_linked(slot_index)
		inventory_changed.emit()
		return false

	inventory_changed.emit()
	return true

# ===== HOTBAR =====

func hotbar_assign(hotbar_slot: int, inventory_slot: int):
	if hotbar_slot < 0 or hotbar_slot >= 10:
		return

	if inventory_slot < -1 or inventory_slot >= MAX_SLOTS:
		return

	hotbar[hotbar_slot] = inventory_slot
	hotbar_changed.emit(hotbar_slot)

func hotbar_use(hotbar_slot: int):
	if hotbar_slot < 0 or hotbar_slot >= 10:
		return

	var inventory_slot = hotbar[hotbar_slot]
	if inventory_slot == -1:
		return

	if slots[inventory_slot] == null:
		hotbar[hotbar_slot] = -1
		hotbar_changed.emit(hotbar_slot)
		return

	var item_data = item_db.get_item(slots[inventory_slot].id)
	var category = item_data.get("category", "")

	match category:
		"food", "drink":
			_consume_item(inventory_slot)
		"medical":
			_use_medical(inventory_slot)
		"tool":
			_equip_tool(inventory_slot)
		"weapon":
			_equip_weapon(inventory_slot)

func _consume_item(slot_index: int):
	var item_data = get_item_at_slot(slot_index)
	if item_data.is_empty():
		return

	# Apply effects via GameState
	var gs = get_node("/root/GameState")
	if gs:
		if item_data.has("hunger"):
			gs.modify_stat("hunger", item_data.hunger)
		if item_data.has("thirst"):
			gs.modify_stat("thirst", item_data.thirst)
		if item_data.has("health"):
			gs.modify_stat("health", item_data.health)
		if item_data.has("fatigue"):
			gs.modify_stat("fatigue", item_data.fatigue)

	# Remove one from stack
	remove_item(item_data.id, 1)

func _use_medical(slot_index: int):
	var item_data = get_item_at_slot(slot_index)
	if item_data.is_empty():
		return

	var injury_system = get_tree().get_first_node_in_group("injury_system")
	if injury_system:
		if item_data.has("heals"):
			var condition_type = item_data.heals
			var heal_amount = item_data.get("heal_amount", 100)
			injury_system.treat_condition(condition_type, heal_amount)
			remove_item(item_data.id, 1)

func _equip_tool(slot_index: int):
	equip_item(slot_index, "hands")

func _equip_weapon(slot_index: int):
	equip_item(slot_index, "weapon")

func _clear_hotbar_slot_if_linked(inventory_slot: int):
	for i in range(10):
		if hotbar[i] == inventory_slot:
			hotbar[i] = -1
			hotbar_changed.emit(i)

# ===== DROP ITEM =====

func drop_item(slot_index: int) -> Dictionary:
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return {}

	if slots[slot_index] == null:
		return {}

	var dropped_item = slots[slot_index].duplicate()
	slots[slot_index] = null
	_clear_hotbar_slot_if_linked(slot_index)

	# Unequip if equipped
	for equip_slot in equipped:
		if equipped[equip_slot].slot_index == slot_index:
			unequip_item(equip_slot)

	inventory_changed.emit()
	return dropped_item

# ===== UTILITY =====

func get_all_items() -> Array:
	var items = []
	for i in range(MAX_SLOTS):
		if slots[i] != null:
			var item_data = get_item_at_slot(i)
			item_data["slot_index"] = i
			items.append(item_data)
	return items

func clear_inventory():
	_initialize_inventory()
	inventory_changed.emit()
