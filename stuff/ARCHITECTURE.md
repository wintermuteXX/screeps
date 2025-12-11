# Screeps AI - Code Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        main.js                               │
│  Entry Point: module.exports.loop()                         │
│  - Initializes modules                                       │
│  - Runs memhack                                             │
│  - Creates ControllerGame                                    │
│  - Processes all rooms                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ControllerGame                            │
│  - Manages all rooms                                        │
│  - processRooms() → calls each ControllerRoom.run()         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ ControllerRoom│ │ ControllerRoom│ │ ControllerRoom│
│   (Room 1)    │ │   (Room 2)    │ │   (Room N)    │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
```

## ControllerRoom Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ControllerRoom                            │
│  Core Room Management                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Sub-Controllers:                                     │   │
│  │  - ControllerSpawn[] (spawns)                       │   │
│  │  - ControllerTower[] (towers)                       │   │
│  │  - ControllerLink (link network)                    │   │
│  │  - ControllerTerminal (trading)                     │   │
│  │  - ControllerFactory (commodities)                   │   │
│  │  - ControllerLab (reactions)                        │   │
│  │  - RoomPlanner (room planning)                      │   │
│  │  - LogisticsGroup (transport system)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Main Methods:                                              │
│  - run() → processes room each tick                         │
│  - getAllCreeps(role) → get creeps by role                  │
│  - getEnemys() → get hostile creeps                         │
│  - givesResources() → resources available                  │
│  - needsResources() → resources needed                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ControllerCreep│ │ControllerSpawn│ │ControllerTower│
│  (Creep AI)   │ │  (Spawning)   │ │  (Defense)   │
└───────┬───────┘ └───────────────┘ └───────────────┘
        │
        ▼
```

## Creep Behavior System

```
┌─────────────────────────────────────────────────────────────┐
│                    ControllerCreep                           │
│  - run(creep) → executes behavior for creep                 │
│  - findBehavior() → selects active behavior                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Behavior System                           │
│  Base: _behavior.js                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Each Behavior has:                                 │   │
│  │  - when(creep, rc) → should behavior be active?    │   │
│  │  - completed(creep, rc) → is behavior done?       │   │
│  │  - work(creep, rc) → execute behavior              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Behavior Types:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Resource Behaviors:                                 │   │
│  │  - get_resources                                    │   │
│  │  - harvest                                          │   │
│  │  - find_near_energy                                 │   │
│  │  - transfer_resources                               │   │
│  │  - transfer_storage                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Work Behaviors:                                     │   │
│  │  - build_structures                                 │   │
│  │  - repair                                           │   │
│  │  - upgrade_controller                               │   │
│  │  - miner_harvest                                    │   │
│  │  - miner_harvest_mineral                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Combat Behaviors:                                   │   │
│  │  - attack_enemy                                     │   │
│  │  - clear_enemy_buildings                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Movement Behaviors:                                 │   │
│  │  - goto_flag                                        │   │
│  │  - goto_home                                        │   │
│  │  - scout                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Special Behaviors:                                  │   │
│  │  - claim_controller                                 │   │
│  │  - place_spawn                                      │   │
│  │  - recycle                                          │   │
│  │  - renew                                            │   │
│  │  - transporter_logistics                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Creep Configuration System

```
┌─────────────────────────────────────────────────────────────┐
│                  config.creeps.js                           │
│  Defines all creep roles and their configurations          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Each Role has:                                      │   │
│  │  - priority: spawn priority                         │   │
│  │  - minLevel: minimum RCL required                   │   │
│  │  - minParts: minimum body parts                     │   │
│  │  - body: body template                              │   │
│  │  - behaviors: array of behavior names                │   │
│  │  - canBuild(rc): should spawn this role?            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Roles:                                                     │
│  - miner, miner_mineral, miner_commodity                   │
│  - transporter                                              │
│  - builder, constructor                                     │
│  - upgrader                                                 │
│  - attacker, defender                                       │
│  - supporter, claimer, scout                                │
└─────────────────────────────────────────────────────────────┘
```

## Logistics System

```
┌─────────────────────────────────────────────────────────────┐
│                  LogisticsGroup                             │
│  Advanced transport system (Gale-Shapley algorithm)        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Request System:                                     │   │
│  │  - request() → resource needed                      │   │
│  │  - provide() → resource available                   │   │
│  │  - addRequest() / removeRequest()                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Transporter Management:                             │   │
│  │  - registerTransporter()                           │   │
│  │  - unregisterTransporter()                          │   │
│  │  - getAssignedRequest()                             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Matching Algorithm:                                 │   │
│  │  - runMatching() → Gale-Shapley matching            │   │
│  │  - calculateDqDt() → transport efficiency           │   │
│  │  - bufferChoices() → buffer options                │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          behavior.transporter_logistics                      │
│  - when() → has assigned request or task?                   │
│  - work() → execute transport task                           │
│  - _createTaskFromRequest() → create task                   │
│  - _executeTask() → execute actions                          │
└─────────────────────────────────────────────────────────────┘
```

## Resource Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ControllerRoom Resource System                  │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ givesResources() │         │ needsResources() │        │
│  │  - Sources       │         │  - Towers         │        │
│  │  - Containers    │         │  - Spawns         │        │
│  │  - Storage       │         │  - Extensions     │        │
│  │  - Links         │         │  - Labs           │        │
│  │  - Dropped       │         │  - Controller     │        │
│  └────────┬─────────┘         └────────┬─────────┘        │
│           │                           │                    │
│           └───────────┬───────────────┘                    │
│                       ▼                                     │
│           ┌───────────────────────┐                        │
│           │  LogisticsGroup       │                        │
│           │  (if enabled)         │                        │
│           └───────────────────────┘                        │
│                       │                                     │
│                       ▼                                     │
│           ┌───────────────────────┐                        │
│           │  Transporters         │                        │
│           │  (old or new system)  │                        │
│           └───────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
main.js
├── memhack (memory optimization)
├── Traveler (pathfinding)
├── Log (logging)
├── ControllerStats (statistics)
├── marketCalculator (market calculations)
├── _init (prototype extensions)
└── ControllerGame
    └── ControllerRoom
        ├── ControllerSpawn
        ├── ControllerCreep
        ├── ControllerTower
        ├── ControllerLink
        ├── ControllerTerminal
        ├── ControllerFactory
        ├── ControllerLab
        ├── RoomPlanner
        └── LogisticsGroup
            └── behavior.transporter_logistics

config.creeps.js
└── Used by ControllerRoom for spawning decisions

constants.js
└── Used by all modules for configuration

_behavior.js
└── Base class for all behaviors
    └── All behavior.*.js files
```

## Data Flow Example: Creep Spawning

```
1. ControllerRoom.run()
   │
   ├─→ Check if spawn needed
   │   │
   │   └─→ config.creeps.js
   │       └─→ canBuild(rc) → check conditions
   │
   ├─→ ControllerSpawn.createCreep()
   │   │
   │   ├─→ Get body from config
   │   ├─→ Evaluate body size
   │   └─→ spawn.spawnCreep()
   │
   └─→ Creep spawned with role in memory
```

## Data Flow Example: Creep Execution

```
1. ControllerRoom.run()
   │
   └─→ For each creep:
       │
       └─→ ControllerCreep.run(creep)
           │
           ├─→ Get config from config.creeps.js
           │
           ├─→ Check current behavior
           │   └─→ behavior.completed()?
           │
           ├─→ If completed, find new behavior
           │   └─→ Try behaviors in order
           │       └─→ behavior.when() → true?
           │
           └─→ Execute behavior
               └─→ behavior.work(creep, rc)
```

## Key Files Summary

### Core System
- **main.js**: Entry point, initializes everything
- **ControllerGame.js**: Manages all rooms
- **ControllerRoom.js**: Core room logic, resource management
- **ControllerCreep.js**: Creep behavior execution
- **config.creeps.js**: Creep role definitions

### Behaviors (behavior.*.js)
- Resource: get_resources, harvest, find_near_energy, transfer_*
- Work: build_structures, repair, upgrade_controller, miner_*
- Combat: attack_enemy, clear_enemy_buildings
- Movement: goto_flag, goto_home, scout
- Special: claim_controller, place_spawn, recycle, renew, transporter_logistics

### Controllers
- **ControllerSpawn**: Spawn management
- **ControllerTower**: Defense and repair
- **ControllerLink**: Link network management
- **ControllerTerminal**: Trading
- **ControllerFactory**: Commodity production
- **ControllerLab**: Lab reactions

### Utilities
- **constants.js**: Configuration values
- **Log.js**: Logging system
- **Traveler.js**: Pathfinding
- **memhack.js**: Memory optimization
- **RoomPlanner.js**: Room planning
- **LogisticsGroup.js**: Advanced transport system

### Initialization
- **_init.js**: Prototype extensions
- **_initGlobal.js**: Global initialization
- **_behavior.js**: Behavior base class

