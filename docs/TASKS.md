# REMNANT — Build Task Tracker

## Build Philosophy
Ship each phase as a playable game. Every phase adds depth. No phase should break what came before.

---

## PHASE 1: Foundation (Current)
The minimum viable survival game. Player can move through an isometric world, see day/night, gather resources, manage inventory, and survive.

- [x] **1.1 Phaser Boot** — Game config, BootScene loads assets, MenuScene with start button
- [x] **1.2 Programmatic Tileset** — Canvas-generated isometric tiles: grass, dirt, stone, water, tree, rock, bush, wood floor, wall
- [x] **1.3 Isometric World Rendering** — Tilemap with 64x32 iso tiles, noise-based terrain, proper depth sorting
- [x] **1.4 Player Entity** — Isometric sprite (generated pixel art), 8-direction movement, walk animation, camera follow
- [x] **1.5 Stat System** — Health, hunger, thirst, temperature, fatigue draining over time, stat bars on HUD
- [x] **1.6 Time System** — Day/night cycle with lighting changes, clock on HUD, time passage
- [x] **1.7 Gathering** — Walk to tree/rock/bush, press E, receive items, resource depletes
- [x] **1.8 Inventory** — Grid inventory with weight, open/close with Tab, item tooltips, use items (eat, drink)
- [x] **1.9 Hotbar** — 6 slots, number keys to select, shows equipped item
- [x] **1.10 Basic Crafting** — Craft campfire, stone tools, bandages from inventory screen
- [x] **1.11 Campfire** — Place campfire in world, stand near it for warmth, cook raw meat
- [x] **1.12 Save/Load** — Serialize game state, POST to server, load on continue
- [x] **1.13 Death** — When health hits 0, show death screen with cause and days survived

**Phase 1 Deliverable:** You can walk around, chop trees, mine rocks, eat berries, craft tools, build a campfire, cook food, stay warm, and survive through day/night cycles. Game saves your progress.

---

## PHASE 2: Wildlife and Combat
Animals populate the world. Some flee, some attack. Hunting becomes essential for survival.

- [x] **2.1 Animal Sprites** — Generated pixel art for deer, rabbit, wolf, bear (+ elk, squirrel, cougar, coyote, raven, fish)
- [x] **2.2 Animal Spawning** — Animals spawn by biome, maintain population count
- [x] **2.3 Prey AI** — Deer/rabbit: idle, wander, flee when player approaches. Elk: flee then charge when low HP.
- [x] **2.4 Predator AI** — Wolf: pack hunt. Bear: territorial warning, charge. Cougar: ambush. Coyote: opportunistic.
- [x] **2.5 Melee Combat** — Click to swing equipped weapon, hit detection, damage calc, weapon degradation
- [x] **2.6 Animal Death/Harvest** — Kill animal, press E to harvest meat/leather/pelts
- [x] **2.7 Injuries System** — Bleeding, fractures, infection from combat, treatment with medical items
- [x] **2.8 Moodle System** — Status icons on screen edge showing all active conditions
- [x] **2.9 Pack Behavior** — Wolves hunt in groups, coordinate approach angles with pack flanking
- [x] **2.10 Sound Aggro** — Loud actions (gathering, combat, building) increase animal detection radius

**Phase 2 Deliverable:** Living world with wildlife. Hunting for food, defending against predators, treating injuries.

---

## PHASE 3: Buildings and Loot
Enterable buildings with rooms and lootable containers. This is where PZ's feel really comes in.

- [ ] **3.1 Building Templates** — Define house, store, cabin, gas station as room layouts
- [ ] **3.2 Building Rendering** — Walls with transparency when player is inside, roof hides
- [ ] **3.3 Doors** — Open/close doors, block animal entry (unless broken)
- [ ] **3.4 Containers** — Cabinets, fridges, shelves, crates as interactive objects with inventories
- [ ] **3.5 Loot Tables** — Weighted item spawns per container type and room type
- [ ] **3.6 Context Menus** — Right-click anything for action list (take, eat, equip, examine, etc.)
- [ ] **3.7 Furniture** — Beds (sleep/save), sinks (dirty water), ovens (cook without campfire)
- [ ] **3.8 Town Generation** — Procedural town placement with roads and building clusters
- [ ] **3.9 Window Barricading** — Board up windows with planks and nails

**Phase 3 Deliverable:** Explore and loot abandoned buildings. Find supplies. Barricade a house as your base.

---

## PHASE 4: Skills, Crafting Depth, and Base Building
Deep progression systems and meaningful base construction.

- [ ] **4.1 Skill XP System** — Actions grant XP, level thresholds, skill effect scaling
- [ ] **4.2 Skills UI** — Character panel showing all skills with XP bars
- [ ] **4.3 Advanced Crafting** — Workbench recipes, tiered tools/weapons, skill requirements
- [ ] **4.4 Build Mode** — Dedicated build interface, wall/floor/door/furniture placement
- [ ] **4.5 Storage Containers** — Craftable crates, shelves for base storage
- [ ] **4.6 Traps** — Snare traps, deadfall traps for passive hunting
- [ ] **4.7 Clothing System** — Layered clothing slots, warmth/protection values, repair
- [ ] **4.8 Foraging System** — Search ground tiles for berries, mushrooms, herbs, insects
- [ ] **4.9 Fishing** — Craft fishing rod, use near water, time-based minigame
- [ ] **4.10 Rain Collector** — Craftable structure, passively collects clean water

**Phase 4 Deliverable:** Deep crafting, skill progression, functional base, multiple food sources.

---

## PHASE 5: Weather, Seasons, and Polish
Dynamic weather, seasonal changes, and the subtle mystery layer.

- [ ] **5.1 Weather System** — Rain particles, fog overlay, wind effects, weather transitions
- [ ] **5.2 Weather Gameplay** — Rain = wet debuff, storms extinguish fires, cold accelerates
- [ ] **5.3 Season Progression** — 30 day seasons, temperature/daylight/foliage changes
- [ ] **5.4 Winter** — Snow tiles, extreme cold, scarce food, visible tracks
- [ ] **5.5 Mystery Layer** — Implement all tiers of ambient Bigfoot events
- [ ] **5.6 Audio System** — Ambient loops, footsteps, actions, animal sounds
- [ ] **5.7 Map System** — In-game map that player fills in as they explore
- [ ] **5.8 Polish Pass** — Smooth all animations, transitions, UI interactions
- [ ] **5.9 Balance Pass** — Tune drain rates, damage values, loot abundance, animal aggression

**Phase 5 Deliverable:** Feature complete survival game with weather, seasons, and atmosphere.

---

## PHASE 6: Advanced (Future)
- [ ] Ranged weapons (bow, slingshot)
- [ ] Abandoned vehicles (lootable, eventually drivable)
- [ ] NPCs/survivors (trade, quest-like interactions)
- [ ] Electricity system (generators, lights)
- [ ] Farming
- [ ] Multiple floors
- [ ] Multiplayer (major undertaking)

---

## STATUS
**Current Phase:** 2 (Complete)
**Last Updated:** Phase 2 complete
**Notes:** Phase 1 + Phase 2 complete. Wildlife with AI behaviors, melee combat, injury/moodle system. Deployed to GitHub at teleias/remnant.
