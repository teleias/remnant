# REMNANT — Game Design Document
## A Survival Game by Christian Claudio

---

## CONCEPT
You wake up alone in a remote cabin in the Pacific Northwest. The power grid is dark. Supply chains are dead. No broadcast, no signal, no explanation. The world didn't end with a bang — it just stopped.

Nature noticed. And nature moved fast.

Wolves den in gas stations. Bears own the grocery stores. Elk herds block entire highways. Mountain lions watch from water towers. You are the trespasser now.

REMNANT is a top-down isometric survival game about enduring in a world where civilization has quietly collapsed and wildlife has reclaimed human spaces. There are no zombies, no aliens, no supernatural threats. Just nature — and nature is enough.

---

## CORE LOOP
1. **Wake up** — Check your condition. What hurts? What's low?
2. **Plan** — Decide today's priority: food, water, warmth, materials, exploration, base improvement
3. **Execute** — Venture out, gather, hunt, scavenge, craft, build
4. **Manage risk** — Weather changes, injuries happen, wildlife is real, night falls
5. **Return** — Get back to shelter before dark (or don't, and deal with consequences)
6. **Improve** — Each day you survive, you get a little better, a little stronger, a little more prepared
7. **Discover** — The world has things in it that don't quite add up

---

## PLAYER CHARACTER

### Stats (0 to 100 scale, drain over time)
- **Health** — Overall HP. Reduced by injuries, sickness, starvation. Heals slowly with rest and food.
- **Hunger** — Drains constantly. Faster with exertion. Zero hunger = health drain.
- **Thirst** — Drains faster than hunger. Dirty water risks sickness. Zero = rapid health drain.
- **Fatigue** — Drains over waking hours. Reduces action speed and accuracy. Must sleep to recover.
- **Temperature** — Affected by weather, clothing, shelter, fire, time of day, wetness.
- **Stress** — Increases from danger, pain, isolation. Decreases with shelter, warmth, comfort items.

### Conditions (Binary states that affect gameplay)
- Bleeding (requires bandage, drains health)
- Fractured (requires splint, reduces movement)
- Infected wound (requires disinfection, worsens over time)
- Sick (from bad water/food, requires rest and medicine)
- Wet (from rain/water, accelerates cold)
- Hypothermic (extreme cold, can kill)
- Exhausted (zero fatigue, severe penalties)
- In Pain (from injuries, reduces all actions)
- Well Fed (bonus from full hunger, slight health regen)
- Hydrated (bonus from full thirst)

### Skills (XP-based progression)
Each action earns XP in its relevant skill. Higher skill = faster actions, better results, new recipes.

| Skill | Leveled By | Effect |
|-------|-----------|--------|
| Foraging | Searching ground, picking plants | Find rarer items, identify edible vs poisonous |
| Cooking | Preparing food | Better nutrition from meals, unlock recipes, less food poisoning |
| Carpentry | Building, crafting wood items | Stronger structures, new building recipes, less material waste |
| Fitness | Running, carrying heavy loads | More stamina, carry capacity, movement speed |
| Strength | Melee combat, chopping | More melee damage, faster chopping/mining |
| Tracking | Following animal signs | See animal tracks, predict behavior, better hunting |
| First Aid | Treating injuries | Faster healing, better bandage effectiveness, diagnose conditions |
| Stealth | Crouching, slow movement | Reduced detection radius, better ambush damage |
| Tailoring | Repairing/crafting clothing | Better repairs, craft advanced clothing, insulation bonuses |

---

## WORLD

### Biomes
- **Dense Forest** — Heavy tree cover, rich foraging, predator territory. Hard to navigate, easy to get lost.
- **Meadow/Clearing** — Open fields, berry bushes, rabbit habitat. Exposed to weather, visible from far.
- **River/Lake** — Water source, fish, but dangerous crossing. Wet debuff.
- **Mountain/Ridge** — Stone resources, elevation advantage, harsh cold. Wind exposure.
- **Road/Highway** — Fastest travel, abandoned vehicles to loot, but exposed and wildlife corridors.
- **Town/Settlement** — Buildings to enter and loot. Richest resources but most dangerous (territorial animals inside).

### Buildings (Enterable, Lootable)
- **Residential Houses** — Canned food, clothing, basic tools, medicine, books
- **Gas Stations** — Fuel (for fires), snacks, maps, lighters, batteries
- **Ranger Stations** — Outdoor gear, axes, rope, first aid, maps, binoculars
- **General Stores** — Wide variety of goods, canned food, tools, bags
- **Warehouses** — Bulk materials, nails, planks, metal sheets
- **Cabins** — Starting area type, basic supplies, sometimes generators
- **Hunting Lodges** — Weapons, ammo, leather gear, trophy mounts, maps
- **Campgrounds** — Tents, sleeping bags, coolers, firewood

### Loot Distribution
- Loot is placed procedurally using weighted tables per room type
- Kitchen containers have food, bathroom has medicine, garage has tools
- Loot does not respawn — the world is finite, adding pressure to explore further
- Some containers are locked (requires tools or skill to open)

---

## WILDLIFE SYSTEM

Animals are the primary threat. They are not enemies — they are animals behaving realistically. You are in their territory.

### Prey Animals
| Animal | Behavior | Drops |
|--------|----------|-------|
| Deer | Grazes in groups, flees immediately, fast | Raw venison (3), leather (2) |
| Elk | Herd animal, flees but can charge if cornered | Raw venison (5), leather (3), antler |
| Rabbit | Solitary, extremely fast flee, common | Raw meat (1) |
| Squirrel | Tree-based, hard to catch | Raw meat (1) |
| Fish | In water tiles, requires fishing | Raw fish (1) |

### Predator Animals
| Animal | Behavior | Damage | Drops |
|--------|----------|--------|-------|
| Wolf | Pack hunter (3-5), encircles, tests before attacking, howls warn of presence | Moderate, multiple attackers | Raw meat (2), wolf pelt (1) |
| Black Bear | Territorial, owns specific buildings/areas, warns before attacking (standing, huffing), extremely dangerous if provoked | Very high | Raw meat (6), bear pelt (1), fat (2) |
| Cougar/Mountain Lion | Ambush predator, stalks silently, attacks from behind, most lethal per-hit | Lethal single strike | Raw meat (3), cougar pelt (1) |
| Coyote | Scavenger, opportunistic, attacks only weak/injured players | Low | Raw meat (1), pelt (1) |

### Ambient Wildlife
| Animal | Role |
|--------|------|
| Ravens | Circle above dead animals, indicator of kills/carcasses nearby |
| Eagles | Ambient, indicator of high elevation |
| Owls | Night ambient, audio only usually |
| Frogs | Near water, audio indicator |

### Animal AI States
1. **Idle** — Standing, grazing, sleeping
2. **Wander** — Moving between points in territory
3. **Alert** — Detected player, watching, deciding
4. **Flee** — Running away (prey animals)
5. **Stalk** — Moving toward player while staying hidden (cougar)
6. **Approach** — Moving toward player cautiously (wolf pack testing)
7. **Charge** — Full speed attack run
8. **Attack** — In melee range, dealing damage
9. **Retreat** — Backing off after attack or deterrent
10. **Territorial** — Warning player to leave area (bear standing, huffing)

### Sound System Interaction
- Loud player actions (chopping, gunfire) increase detection radius
- Sneaking reduces detection radius
- Wind direction affects scent (future implementation)
- Animals have hearing range and sight cone

---

## ITEMS

### Categories
- **Food** — Raw, cooked, canned, foraged, preserved
- **Water** — Dirty, boiled, purified, collected rain
- **Tools** — Axes, knives, saws, hammers, shovels, fishing poles
- **Weapons** — Melee (bat, axe, spear, knife) and ranged (bow, slingshot)
- **Materials** — Wood, stone, rope, nails, metal, cloth, leather
- **Medical** — Bandages, splints, disinfectant, painkillers, antibiotics
- **Clothing** — Shirts, pants, jackets, boots, gloves, hats (layered system)
- **Containers** — Backpacks, duffel bags, pouches (increase carry capacity)
- **Misc** — Books (skill XP), maps, lighters, flashlights, batteries, watches

### Item Properties
Every item has:
- **Weight** (grams) — affects carry capacity
- **Condition** (0-100) — degrades with use, can be repaired
- **Stack size** — how many per inventory slot
- **Category** — for UI organization
- **Actions** — what you can do with it (eat, drink, equip, craft, place, read)

---

## CRAFTING

### Workstation Requirements
- **None (hands)** — Basic items: torn sheets, sharpened stick, stone knife
- **Campfire** — Cooking, boiling water, rendering fat
- **Workbench** — Advanced tools, weapons, furniture
- **Sewing station** — Clothing repair and crafting

### Recipe Examples (50+ total in items.js)
| Output | Inputs | Station | Skill |
|--------|--------|---------|-------|
| Campfire | Stones x8, Sticks x4, Tinder x1 | None | — |
| Stone Axe | Stone x2, Stick x1, Cordage x1 | None | Carpentry 0 |
| Boiled Water | Pot + Dirty Water + Campfire | Campfire | Cooking 0 |
| Wooden Wall | Planks x4, Nails x6 | None | Carpentry 2 |
| Splint | Sticks x2, Rags x2 | None | First Aid 0 |
| Fur Coat | Pelts x4, Cordage x3, Needle x1 | Sewing | Tailoring 3 |
| Bow | Flexible Branch x1, Cordage x1 | None | Carpentry 2 |
| Arrow x5 | Sticks x5, Feathers x3, Stone Chips x5 | None | Carpentry 1 |

---

## BUILDING SYSTEM

### Mechanics
- Enter build mode (B key)
- Select structure from build menu (categories: walls, floors, doors, furniture, utility)
- Ghost preview snaps to tile grid
- Click to place if materials available
- Some structures require skill level
- Structures have HP, can be damaged by animals or weather
- Upgrade path: stick wall → log wall → plank wall → reinforced wall

### Structures
- Walls (stick, log, plank, stone)
- Doors (with lock crafting)
- Floors (dirt, wood, stone)
- Campfire, fire pit, stone oven
- Workbench
- Storage crates (containers)
- Bed/sleeping bag
- Rain collector
- Drying rack (preserve meat)
- Snare trap, deadfall trap

---

## DAY/NIGHT AND WEATHER

### Time
- 1 real minute = 1 game hour (24 minutes per full day)
- Dawn: 5:00-7:00 (light increases)
- Day: 7:00-18:00
- Dusk: 18:00-20:00 (light decreases)
- Night: 20:00-5:00 (dark, dangerous, cold)

### Weather States
| Weather | Effect |
|---------|--------|
| Clear | Normal visibility, moderate temperature |
| Overcast | Reduced light, slightly cooler |
| Rain | Wet debuff, reduced visibility, cold, extinguishes open fires |
| Heavy Rain | Severe wet/cold, very low visibility, flood risk near rivers |
| Fog | Extremely low visibility, reduced animal detection range too |
| Wind | Temperature reduction, sound carries further |
| Storm | Rain + wind combined, dangerous to be outside |
| Snow | (Winter) Extreme cold, tracks visible, slow movement |

### Seasons (Long-term progression)
- **Spring** — Moderate temps, frequent rain, plants growing
- **Summer** — Warm, long days, abundant foraging
- **Autumn** — Cooling, short days, animals more aggressive (pre-winter)
- **Winter** — Deadly cold, short days, scarce food, snow

---

## THE MYSTERY LAYER

### Philosophy
Not horror. Not supernatural. Documentary realism. The Bigfoot element exists at the absolute periphery of the game. A player could play for 20 hours and experience maybe 3 subtle events. The goal is atmosphere, not gameplay mechanics.

### Event Tiers (Gated by game days survived)

**Tier 1 (Day 5+): Environmental Audio**
- Distant wood knocks at night (2-3 knocks, then silence)
- A heavy bipedal footstep sound once, distant, during fog
- An unidentifiable vocalization, very far away, at dusk

**Tier 2 (Day 15+): Environmental Visual**
- A tree structure (3 trees leaned together) appears in a location you've passed before
- A rock cairn that wasn't there yesterday
- A large branch snapped at 8+ feet height

**Tier 3 (Day 30+): Direct Evidence**
- A single oversized footprint in mud near a water source
- An item you left at a specific location has been moved (subtle, player may not notice)
- Game camera: at extreme distance, between trees, a dark tall shape for 2-3 seconds, then gone

**Tier 4 (Day 60+): Encounter**
- At night, near the edge of firelight, two reflected eyes at wrong height (7+ feet), gone in 1 second
- A notification: "You feel something watching you." Combined with distant branch snap.
- Never a full clear sighting. Never combat. Never confirmation. Always deniable.

### Implementation Rules
- Minimum 4 real hours between any mystery events
- Events only trigger when player is alone, not in combat, not in a building
- Night events are 3x more likely
- Fog/rain increases probability slightly
- NO event should ever directly threaten the player
- The Bigfoot entity is never spawned as a game object the player can interact with

---

## UI LAYOUT (PZ Reference)

```
┌─────────────────────────────────────────────────┐
│ [Compass]              [Day X]  [12:00]  [Clear]│
│                                          [Moodle]│
│                                          [Moodle]│
│                                          [Moodle]│
│                                          [Moodle]│
│                                                  │
│              GAME WORLD (Isometric)               │
│                                                  │
│                                                  │
│                                                  │
│ [Health ████████░░]                              │
│ [Hunger ██████░░░░]     [1][2][3][4][5][6]      │
│ [Thirst █████████░]         Hotbar               │
│ [Temp   ███████░░░]                              │
└─────────────────────────────────────────────────┘
```

### Key Bindings
| Key | Action |
|-----|--------|
| WASD | Move (8-directional) |
| Shift | Sprint |
| Ctrl | Sneak |
| E | Interact with nearest object |
| I / Tab | Open inventory |
| C | Open crafting |
| B | Build mode |
| M | Map |
| K | Skills |
| Q | Quick save |
| 1-6 | Hotbar slots |
| Right Click | Context menu on world objects |
| Left Click | Primary action (attack, use tool) |
| Scroll | Zoom camera |
| Space | Pause |

---

## AUDIO DESIGN (Future Phase)

### Ambient Layers
- Forest: wind through trees, bird calls, insect hum, distant water
- Night: crickets, owl calls, wolf howls (distant), branch creaks
- Rain: rain on leaves, rain on roof (if sheltered), distant thunder
- Indoor: muffled outdoor sounds, creaking wood, dripping

### Action Sounds
- Footsteps (surface-dependent: grass, wood, stone, water)
- Chopping, mining, crafting
- Animal vocalizations (growl, howl, screech, huff)
- Inventory management (cloth rustling, metal clinking)
- Fire crackling
- Wind gusts

---

*This document is the source of truth for game design decisions. Update it as features are built and design evolves.*
