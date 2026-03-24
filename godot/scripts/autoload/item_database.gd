extends Node

var items: Dictionary = {}

func _ready():
	_register_all_items()

func get_item(id: String) -> Dictionary:
	return items.get(id, {})

func get_items_by_category(category: String) -> Array:
	var result = []
	for item_id in items:
		if items[item_id].get("category") == category:
			result.append({"id": item_id, "data": items[item_id]})
	return result

func _add(id: String, data: Dictionary):
	items[id] = data

func _register_all_items():
	# ===== FOOD - RAW =====
	_add("raw_venison", {
		"name": "Raw Venison",
		"category": "food",
		"weight": 500,
		"stack": 5,
		"hunger": 20,
		"thirst": 0,
		"health": -2,
		"description": "Raw deer meat. Cook before eating to avoid food poisoning."
	})

	_add("raw_meat", {
		"name": "Raw Meat",
		"category": "food",
		"weight": 400,
		"stack": 5,
		"hunger": 15,
		"thirst": 0,
		"health": -3,
		"description": "Raw meat from a wild animal. Unsafe to eat uncooked."
	})

	_add("raw_fish", {
		"name": "Raw Fish",
		"category": "food",
		"weight": 300,
		"stack": 5,
		"hunger": 12,
		"thirst": 0,
		"health": -1,
		"description": "Fresh catch from the river. Better cooked."
	})

	_add("raw_rabbit", {
		"name": "Raw Rabbit",
		"category": "food",
		"weight": 250,
		"stack": 5,
		"hunger": 10,
		"thirst": 0,
		"health": -1,
		"description": "Small game meat. Needs cooking."
	})

	# ===== FOOD - COOKED =====
	_add("cooked_venison", {
		"name": "Cooked Venison",
		"category": "food",
		"weight": 450,
		"stack": 5,
		"hunger": 35,
		"thirst": -5,
		"health": 3,
		"description": "Well-cooked venison steak. Nutritious and safe."
	})

	_add("cooked_meat", {
		"name": "Cooked Meat",
		"category": "food",
		"weight": 350,
		"stack": 5,
		"hunger": 25,
		"thirst": -5,
		"health": 2,
		"description": "Grilled meat. Filling and safe to eat."
	})

	_add("cooked_fish", {
		"name": "Cooked Fish",
		"category": "food",
		"weight": 250,
		"stack": 5,
		"hunger": 20,
		"thirst": -3,
		"health": 2,
		"description": "Pan-fried fish. Light and nutritious."
	})

	_add("cooked_rabbit", {
		"name": "Cooked Rabbit",
		"category": "food",
		"weight": 200,
		"stack": 5,
		"hunger": 15,
		"thirst": -3,
		"health": 1,
		"description": "Roasted rabbit. Tender and flavorful."
	})

	# ===== FORAGED =====
	_add("berries", {
		"name": "Wild Berries",
		"category": "food",
		"weight": 100,
		"stack": 10,
		"hunger": 5,
		"thirst": 3,
		"health": 1,
		"description": "Sweet wild berries. A quick snack."
	})

	_add("mushroom", {
		"name": "Mushroom",
		"category": "food",
		"weight": 80,
		"stack": 10,
		"hunger": 8,
		"thirst": 2,
		"health": 0,
		"description": "Edible wild mushroom. Better cooked."
	})

	_add("herbs", {
		"name": "Medicinal Herbs",
		"category": "material",
		"weight": 50,
		"stack": 20,
		"description": "Wild herbs with medicinal properties."
	})

	_add("pine_nuts", {
		"name": "Pine Nuts",
		"category": "food",
		"weight": 60,
		"stack": 15,
		"hunger": 6,
		"thirst": -2,
		"health": 1,
		"description": "Nutritious pine nuts. High in calories."
	})

	_add("insects", {
		"name": "Edible Insects",
		"category": "food",
		"weight": 30,
		"stack": 20,
		"hunger": 3,
		"thirst": 0,
		"health": 0,
		"description": "Protein-rich insects. Not appetizing but nutritious."
	})

	# ===== CANNED/PRESERVED =====
	_add("canned_beans", {
		"name": "Canned Beans",
		"category": "food",
		"weight": 450,
		"stack": 3,
		"hunger": 30,
		"thirst": -5,
		"health": 1,
		"description": "Canned beans. High in protein and fiber."
	})

	_add("canned_soup", {
		"name": "Canned Soup",
		"category": "food",
		"weight": 500,
		"stack": 3,
		"hunger": 25,
		"thirst": 10,
		"health": 2,
		"description": "Hearty canned soup. Warms you up."
	})

	_add("canned_fruit", {
		"name": "Canned Fruit",
		"category": "food",
		"weight": 400,
		"stack": 3,
		"hunger": 20,
		"thirst": 8,
		"health": 1,
		"description": "Sweet canned fruit in syrup."
	})

	_add("jerky", {
		"name": "Beef Jerky",
		"category": "food",
		"weight": 100,
		"stack": 10,
		"hunger": 15,
		"thirst": -8,
		"health": 0,
		"description": "Dried meat. Long shelf life but makes you thirsty."
	})

	_add("granola_bar", {
		"name": "Granola Bar",
		"category": "food",
		"weight": 50,
		"stack": 15,
		"hunger": 10,
		"thirst": -3,
		"health": 0,
		"description": "Compressed oats and honey. Quick energy."
	})

	_add("chips", {
		"name": "Potato Chips",
		"category": "food",
		"weight": 150,
		"stack": 5,
		"hunger": 8,
		"thirst": -10,
		"health": -1,
		"description": "Salty snack food. Not very nutritious."
	})

	# ===== DRINKS =====
	_add("water_dirty", {
		"name": "Dirty Water",
		"category": "drink",
		"weight": 300,
		"stack": 5,
		"hunger": 0,
		"thirst": 15,
		"health": -2,
		"description": "Untreated water. May cause sickness."
	})

	_add("water_boiled", {
		"name": "Boiled Water",
		"category": "drink",
		"weight": 300,
		"stack": 5,
		"hunger": 0,
		"thirst": 20,
		"health": 0,
		"description": "Purified water. Safe to drink."
	})

	_add("water_bottle", {
		"name": "Bottled Water",
		"category": "drink",
		"weight": 500,
		"stack": 3,
		"hunger": 0,
		"thirst": 30,
		"health": 0,
		"description": "Clean bottled water. Refreshing."
	})

	_add("soda", {
		"name": "Soda Can",
		"category": "drink",
		"weight": 350,
		"stack": 5,
		"hunger": 5,
		"thirst": 15,
		"health": -1,
		"description": "Sugary carbonated drink."
	})

	_add("coffee", {
		"name": "Coffee",
		"category": "drink",
		"weight": 250,
		"stack": 5,
		"hunger": 0,
		"thirst": 10,
		"health": 0,
		"fatigue": 15,
		"description": "Hot coffee. Reduces fatigue temporarily."
	})

	# ===== TOOLS =====
	_add("stone_axe", {
		"name": "Stone Axe",
		"category": "tool",
		"weight": 1200,
		"stack": 1,
		"tool_power": 2,
		"tool_type": "axe",
		"condition": 100,
		"max_condition": 100,
		"description": "Crude axe made from stone and wood. Good for chopping."
	})

	_add("stone_pickaxe", {
		"name": "Stone Pickaxe",
		"category": "tool",
		"weight": 1300,
		"stack": 1,
		"tool_power": 2,
		"tool_type": "pickaxe",
		"condition": 100,
		"max_condition": 100,
		"description": "Stone tool for breaking rocks."
	})

	_add("stone_knife", {
		"name": "Stone Knife",
		"category": "tool",
		"weight": 300,
		"stack": 1,
		"tool_power": 1,
		"tool_type": "knife",
		"condition": 100,
		"max_condition": 100,
		"description": "Sharp stone blade. Used for butchering and crafting."
	})

	_add("metal_axe", {
		"name": "Metal Axe",
		"category": "tool",
		"weight": 2000,
		"stack": 1,
		"tool_power": 4,
		"tool_type": "axe",
		"condition": 100,
		"max_condition": 100,
		"description": "Professional-grade axe. Very effective."
	})

	_add("metal_knife", {
		"name": "Hunting Knife",
		"category": "tool",
		"weight": 250,
		"stack": 1,
		"tool_power": 3,
		"tool_type": "knife",
		"condition": 100,
		"max_condition": 100,
		"description": "Sharp steel knife. Essential for survival."
	})

	_add("saw", {
		"name": "Hand Saw",
		"category": "tool",
		"weight": 800,
		"stack": 1,
		"tool_power": 3,
		"tool_type": "saw",
		"condition": 100,
		"max_condition": 100,
		"description": "Used for cutting planks and precise woodwork."
	})

	_add("hammer", {
		"name": "Hammer",
		"category": "tool",
		"weight": 600,
		"stack": 1,
		"tool_power": 3,
		"tool_type": "hammer",
		"condition": 100,
		"max_condition": 100,
		"description": "Construction hammer. Needed for building."
	})

	_add("shovel", {
		"name": "Shovel",
		"category": "tool",
		"weight": 1500,
		"stack": 1,
		"tool_power": 2,
		"tool_type": "shovel",
		"condition": 100,
		"max_condition": 100,
		"description": "For digging and moving earth."
	})

	_add("fishing_rod", {
		"name": "Fishing Rod",
		"category": "tool",
		"weight": 400,
		"stack": 1,
		"tool_power": 1,
		"tool_type": "fishing",
		"condition": 100,
		"max_condition": 100,
		"description": "Simple fishing rod. Cast near water."
	})

	_add("pot", {
		"name": "Cooking Pot",
		"category": "tool",
		"weight": 800,
		"stack": 1,
		"tool_power": 1,
		"tool_type": "cookware",
		"condition": 100,
		"max_condition": 100,
		"description": "Metal pot for boiling water and cooking."
	})

	_add("lighter", {
		"name": "Lighter",
		"category": "tool",
		"weight": 50,
		"stack": 1,
		"tool_power": 5,
		"tool_type": "fire",
		"condition": 100,
		"max_condition": 100,
		"description": "Butane lighter. Makes fire starting easy."
	})

	# ===== WEAPONS =====
	_add("wooden_spear", {
		"name": "Wooden Spear",
		"category": "weapon",
		"weight": 800,
		"stack": 1,
		"damage": 12,
		"range": 2.0,
		"attack_speed": 1.2,
		"condition": 100,
		"max_condition": 100,
		"description": "Sharpened wooden spear. Good reach."
	})

	_add("baseball_bat", {
		"name": "Baseball Bat",
		"category": "weapon",
		"weight": 900,
		"stack": 1,
		"damage": 15,
		"range": 1.5,
		"attack_speed": 1.0,
		"condition": 100,
		"max_condition": 100,
		"description": "Wooden bat. Solid melee weapon."
	})

	_add("crowbar", {
		"name": "Crowbar",
		"category": "weapon",
		"weight": 1200,
		"stack": 1,
		"damage": 18,
		"range": 1.5,
		"attack_speed": 0.9,
		"condition": 100,
		"max_condition": 100,
		"description": "Heavy metal bar. Devastating and durable."
	})

	_add("bow", {
		"name": "Makeshift Bow",
		"category": "weapon",
		"weight": 600,
		"stack": 1,
		"damage": 20,
		"range": 8.0,
		"attack_speed": 1.5,
		"condition": 100,
		"max_condition": 100,
		"description": "Primitive bow. Requires arrows."
	})

	_add("arrow", {
		"name": "Arrow",
		"category": "ammo",
		"weight": 50,
		"stack": 20,
		"description": "Wooden arrow with stone tip."
	})

	# ===== MATERIALS =====
	_add("wood_log", {
		"name": "Wood Log",
		"category": "material",
		"weight": 2000,
		"stack": 5,
		"description": "Heavy log. Can be processed into planks."
	})

	_add("plank", {
		"name": "Wood Plank",
		"category": "material",
		"weight": 800,
		"stack": 10,
		"description": "Sawn plank. Used for construction."
	})

	_add("stick", {
		"name": "Stick",
		"category": "material",
		"weight": 100,
		"stack": 20,
		"description": "Wooden stick. Basic crafting material."
	})

	_add("stone", {
		"name": "Stone",
		"category": "material",
		"weight": 500,
		"stack": 10,
		"description": "Heavy stone. Used for tools and building."
	})

	_add("flint", {
		"name": "Flint",
		"category": "material",
		"weight": 200,
		"stack": 15,
		"description": "Sharp flint rock. Good for making tools and fire."
	})

	_add("fiber", {
		"name": "Plant Fiber",
		"category": "material",
		"weight": 50,
		"stack": 30,
		"description": "Tough plant fibers. Used for cordage."
	})

	_add("cordage", {
		"name": "Cordage",
		"category": "material",
		"weight": 80,
		"stack": 20,
		"description": "Twisted fiber rope. Essential for crafting."
	})

	_add("nails", {
		"name": "Nails",
		"category": "material",
		"weight": 10,
		"stack": 50,
		"description": "Metal nails. Needed for construction."
	})

	_add("scrap_metal", {
		"name": "Scrap Metal",
		"category": "material",
		"weight": 600,
		"stack": 10,
		"description": "Pieces of scrap metal. Can be repurposed."
	})

	_add("cloth", {
		"name": "Cloth",
		"category": "material",
		"weight": 100,
		"stack": 15,
		"description": "Fabric scraps. Used for bandages and clothing."
	})

	_add("leather", {
		"name": "Leather",
		"category": "material",
		"weight": 300,
		"stack": 10,
		"description": "Tanned hide. Durable material."
	})

	_add("pelt_wolf", {
		"name": "Wolf Pelt",
		"category": "material",
		"weight": 800,
		"stack": 3,
		"description": "Thick wolf fur. Excellent for warmth."
	})

	_add("pelt_bear", {
		"name": "Bear Pelt",
		"category": "material",
		"weight": 2000,
		"stack": 2,
		"description": "Massive bear hide. Ultimate insulation."
	})

	_add("pelt_deer", {
		"name": "Deer Pelt",
		"category": "material",
		"weight": 1000,
		"stack": 3,
		"description": "Soft deer hide. Good for clothing."
	})

	_add("feathers", {
		"name": "Feathers",
		"category": "material",
		"weight": 10,
		"stack": 30,
		"description": "Bird feathers. Used for arrows and insulation."
	})

	_add("fat", {
		"name": "Animal Fat",
		"category": "material",
		"weight": 200,
		"stack": 10,
		"description": "Rendered animal fat. Used for waterproofing and fuel."
	})

	_add("tinder", {
		"name": "Tinder",
		"category": "material",
		"weight": 20,
		"stack": 30,
		"description": "Dry tinder material. Essential for fire starting."
	})

	_add("charcoal", {
		"name": "Charcoal",
		"category": "material",
		"weight": 100,
		"stack": 20,
		"description": "Charcoal from burned wood. Fuel and water filter."
	})

	# ===== MEDICAL =====
	_add("bandage", {
		"name": "Bandage",
		"category": "medical",
		"weight": 50,
		"stack": 10,
		"heals": "bleeding",
		"heal_amount": 100,
		"description": "Sterile bandage. Stops bleeding."
	})

	_add("splint", {
		"name": "Splint",
		"category": "medical",
		"weight": 200,
		"stack": 5,
		"heals": "fractured",
		"heal_amount": 100,
		"description": "Immobilizes broken bones."
	})

	_add("disinfectant", {
		"name": "Disinfectant",
		"category": "medical",
		"weight": 150,
		"stack": 5,
		"heals": "infected",
		"heal_amount": 50,
		"description": "Prevents and treats infection."
	})

	_add("painkillers", {
		"name": "Painkillers",
		"category": "medical",
		"weight": 30,
		"stack": 15,
		"heals": "pain",
		"heal_amount": 100,
		"description": "Reduces pain for 2 hours."
	})

	_add("antibiotics", {
		"name": "Antibiotics",
		"category": "medical",
		"weight": 50,
		"stack": 10,
		"heals": "sick",
		"heal_amount": 100,
		"description": "Treats bacterial infections."
	})

	_add("vitamins", {
		"name": "Vitamins",
		"category": "medical",
		"weight": 40,
		"stack": 15,
		"health": 5,
		"description": "Multivitamins. Boosts immune system."
	})

	# ===== CLOTHING =====
	_add("tshirt", {
		"name": "T-Shirt",
		"category": "clothing",
		"weight": 150,
		"stack": 1,
		"slot": "torso",
		"warmth": 1,
		"protection": 0,
		"condition": 100,
		"max_condition": 100,
		"description": "Basic cotton shirt."
	})

	_add("flannel", {
		"name": "Flannel Shirt",
		"category": "clothing",
		"weight": 300,
		"stack": 1,
		"slot": "torso",
		"warmth": 3,
		"protection": 1,
		"condition": 100,
		"max_condition": 100,
		"description": "Warm flannel shirt. Good insulation."
	})

	_add("jacket", {
		"name": "Jacket",
		"category": "clothing",
		"weight": 600,
		"stack": 1,
		"slot": "torso",
		"warmth": 5,
		"protection": 2,
		"condition": 100,
		"max_condition": 100,
		"description": "Insulated jacket. Keeps you warm."
	})

	_add("fur_coat", {
		"name": "Fur Coat",
		"category": "clothing",
		"weight": 1500,
		"stack": 1,
		"slot": "torso",
		"warmth": 10,
		"protection": 3,
		"condition": 100,
		"max_condition": 100,
		"description": "Heavy fur coat. Extreme cold protection."
	})

	_add("jeans", {
		"name": "Jeans",
		"category": "clothing",
		"weight": 400,
		"stack": 1,
		"slot": "legs",
		"warmth": 2,
		"protection": 1,
		"condition": 100,
		"max_condition": 100,
		"description": "Durable denim pants."
	})

	_add("boots", {
		"name": "Boots",
		"category": "clothing",
		"weight": 800,
		"stack": 1,
		"slot": "feet",
		"warmth": 2,
		"protection": 2,
		"condition": 100,
		"max_condition": 100,
		"description": "Sturdy hiking boots."
	})

	_add("gloves", {
		"name": "Gloves",
		"category": "clothing",
		"weight": 100,
		"stack": 1,
		"slot": "hands",
		"warmth": 2,
		"protection": 1,
		"condition": 100,
		"max_condition": 100,
		"description": "Warm gloves. Protects hands."
	})

	_add("beanie", {
		"name": "Beanie",
		"category": "clothing",
		"weight": 80,
		"stack": 1,
		"slot": "head",
		"warmth": 3,
		"protection": 0,
		"condition": 100,
		"max_condition": 100,
		"description": "Wool hat. Prevents heat loss."
	})

	# ===== CONTAINERS =====
	_add("backpack", {
		"name": "Backpack",
		"category": "container",
		"weight": 500,
		"stack": 1,
		"capacity_bonus": 10000,
		"slot": "back",
		"description": "Large backpack. +10kg carrying capacity."
	})

	_add("duffel_bag", {
		"name": "Duffel Bag",
		"category": "container",
		"weight": 400,
		"stack": 1,
		"capacity_bonus": 15000,
		"slot": "back",
		"description": "Heavy-duty duffel. +15kg carrying capacity."
	})

	_add("fanny_pack", {
		"name": "Fanny Pack",
		"category": "container",
		"weight": 100,
		"stack": 1,
		"capacity_bonus": 2000,
		"slot": "waist",
		"description": "Small waist pack. +2kg carrying capacity."
	})

	# ===== MISC =====
	_add("matches", {
		"name": "Matches",
		"category": "misc",
		"weight": 30,
		"stack": 1,
		"tool_power": 3,
		"tool_type": "fire",
		"condition": 20,
		"max_condition": 20,
		"description": "Box of matches. Each use consumes one match."
	})

	_add("flashlight", {
		"name": "Flashlight",
		"category": "misc",
		"weight": 200,
		"stack": 1,
		"description": "Battery-powered flashlight. Illuminates darkness."
	})

	_add("batteries", {
		"name": "Batteries",
		"category": "misc",
		"weight": 50,
		"stack": 10,
		"description": "AA batteries. Powers electronics."
	})

	_add("compass_item", {
		"name": "Compass",
		"category": "misc",
		"weight": 80,
		"stack": 1,
		"description": "Navigation compass. Shows cardinal directions."
	})

	_add("map_local", {
		"name": "Local Map",
		"category": "misc",
		"weight": 50,
		"stack": 1,
		"description": "Map of the local area. Reveals nearby locations."
	})

	_add("foraging_guide", {
		"name": "Foraging Guide",
		"category": "misc",
		"weight": 200,
		"stack": 1,
		"skill_bonus": {"foraging": 1},
		"description": "Field guide to edible plants. +1 foraging skill when carried."
	})

	_add("carpentry_book", {
		"name": "Carpentry Manual",
		"category": "misc",
		"weight": 300,
		"stack": 1,
		"skill_bonus": {"carpentry": 1},
		"description": "How-to guide for woodworking. +1 carpentry skill when carried."
	})

	_add("cooking_book", {
		"name": "Cooking Book",
		"category": "misc",
		"weight": 250,
		"stack": 1,
		"skill_bonus": {"cooking": 1},
		"description": "Recipe collection. +1 cooking skill when carried."
	})

	_add("firstaid_manual", {
		"name": "First Aid Manual",
		"category": "misc",
		"weight": 200,
		"stack": 1,
		"skill_bonus": {"medical": 1},
		"description": "Medical reference guide. +1 medical skill when carried."
	})

	_add("watch", {
		"name": "Watch",
		"category": "misc",
		"weight": 50,
		"stack": 1,
		"description": "Wristwatch. Shows current time."
	})

	_add("rope", {
		"name": "Rope",
		"category": "misc",
		"weight": 800,
		"stack": 3,
		"description": "50ft of rope. Used for climbing and securing."
	})

	_add("duct_tape", {
		"name": "Duct Tape",
		"category": "misc",
		"weight": 150,
		"stack": 5,
		"description": "Repairs almost anything temporarily."
	})

	_add("can_opener", {
		"name": "Can Opener",
		"category": "misc",
		"weight": 80,
		"stack": 1,
		"description": "Required to open canned food."
	})
