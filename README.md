# Screeps AI Codebase

A comprehensive, modular AI codebase for [Screeps](https://screeps.com) - an MMO strategy game where you program your units using JavaScript.

**Player:** utiuti  
**Original Codebase:** lethallic (inactive)  
**Status:** Actively maintained and optimized

## Project Overview

This is a production-ready Screeps AI that manages multiple rooms, creeps, structures, and resources. The codebase follows a modular architecture with clear separation of concerns, making it easy to extend and maintain.

### Architecture

The codebase uses a **Controller Pattern** with the following hierarchy:

```
ControllerGame
  └── ControllerRoom (per room)
      ├── ControllerSpawn (spawn management)
      ├── ControllerCreep (creep behavior execution)
      ├── ControllerTower (defense)
      ├── ControllerLink (energy distribution)
      ├── ControllerTerminal (market trading)
      ├── ControllerFactory (commodity production)
      └── ControllerLab (mineral reactions)
```

### Key Features

- **Modular Behavior System**: Creeps use a priority-based behavior system where each behavior defines `when()`, `completed()`, and `work()` methods
- **Configuration-Driven**: All creep roles and their properties are defined in `config.creeps.js`
- **Resource Management**: Intelligent transport system that matches resource providers with consumers based on priority
- **Market Integration**: Automated buying/selling of resources via terminal
- **Factory Production**: Automated commodity production based on factory level
- **Lab Reactions**: Automated mineral reactions for advanced resources
- **Multi-Room Support**: Handles multiple rooms with independent controllers
- **Performance Optimized**: 
  - Memhack for memory optimization
  - Tick-level caching for expensive operations
  - Prototype extensions for efficient structure access
- **Centralized Constants**: All magic numbers and thresholds in `constants.js`

### Main Components

#### Core Controllers
- **ControllerGame**: Top-level game loop, room management, garbage collection
- **ControllerRoom**: Room-level logic, resource distribution, structure management
- **ControllerCreep**: Behavior execution engine for individual creeps

#### Structure Controllers
- **ControllerSpawn**: Creep spawning with dynamic body generation
- **ControllerTower**: Defense and repair operations
- **ControllerLink**: Energy distribution between links
- **ControllerTerminal**: Market trading and resource management
- **ControllerFactory**: Commodity production automation
- **ControllerLab**: Mineral reaction management

#### Systems
- **Behavior System**: 25+ modular behaviors for creep actions
- **Transport System**: Priority-based resource distribution
- **Market System**: Automated trading and price management
- **Memory Management**: Memhack for optimal memory usage

### Creep Roles

The codebase supports the following creep roles:

- **builder**: Constructs buildings and repairs structures
- **miner**: Harvests energy from sources
- **miner_mineral**: Harvests minerals from extractors
- **miner_commodity**: Harvests commodities from remote locations
- **transporter**: Transports resources between structures
- **upgrader**: Upgrades room controller
- **upgrader8**: Specialized upgrader for RCL 8
- **constructor**: Builds and repairs structures
- **attacker**: Attacks hostile creeps/structures
- **defender**: Defends rooms from invaders
- **supporter**: Supports remote rooms
- **claimer**: Claims new rooms

### Recent Improvements

- ✅ Added memhack for memory optimization
- ✅ Extracted all constants to `constants.js`
- ✅ Fixed critical bugs (memory reset, terrain checks, null comparisons)
- ✅ Optimized prototype implementations
- ✅ Improved caching strategies
- ✅ Created automated deployment script
- ✅ Enhanced error handling and logging

## Quick Start

### Prerequisites

- Node.js 20+ installed
- Screeps account with email/password

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/wintermuteXX/screeps.git
   cd screeps
   ```

2. **Create credentials file:**
   ```bash
   cp .screepsrc.example .screepsrc
   # Edit .screepsrc with your Screeps credentials
   ```

3. **Deploy your code:**
   ```bash
   node upload.js
   ```
   
   Or use the npm script:
   ```bash
   npm run deploy
   ```

## Deployment

### Using the Upload Script

The `upload.js` script reads all `.js` files from the `src/` directory and uploads them to Screeps.

1. **Create `.screepsrc` file** (if not already done):
   ```bash
   email=your@email.com
   password=yourpassword
   branch=default
   ```

2. **Deploy:**
   ```bash
   node upload.js
   ```

The script will:
- Authenticate with Screeps
- Read all modules from `src/`
- Upload to your specified branch
- Show progress and module count

## Project Structure

```
src/
├── main.js                 # Entry point, game loop
├── constants.js            # Centralized configuration values
├── memhack.js              # Memory optimization
├── config.creeps.js        # Creep role definitions
├── Controller*.js          # Room and structure controllers
├── behavior.*.js           # Creep behavior modules
├── _init.js                # Prototype extensions
├── _initGlobal.js          # Global utilities and prototypes
├── Traveler.js             # Pathfinding library
├── marketCalculator.js     # Market analysis tools
└── Log.js                  # Logging utility
```

## Configuration

### constants.js

All game constants, thresholds, and limits are centralized in `constants.js`:

- CPU thresholds and tick intervals
- Resource collection thresholds
- Creep limits per role
- Structure energy thresholds
- Priority values for transport system
- Pathfinding settings

### config.creeps.js

```
module.exports = {
  ...

  <role> : {
    [priority : int],
    [levelMin : int],
    [levelMax : int],

    canBuild : function:boolean

    body : [ // body ],

    behaviors : [<behavior name 1>, <behavior name 2>, ...]

  },

  ...
}
```

### behavior.[behavior name].js

```
var Behavior = require("_behavior");

var b = new Behavior("name");

b.when = function(creep, rc) {
  return true;
};

b.completed = function(creep, rc) {
  return false;
};

b.work = function(creep, rc) {

};

module.exports = b;
```

## How It Works

### Game Loop Flow

1. **main.js** initializes and runs the game loop
2. **memhack.js** optimizes memory access
3. **ControllerGame** processes all rooms
4. For each room:
   - **ControllerRoom** manages room-level operations
   - **ControllerSpawn** spawns new creeps based on priorities
   - **ControllerCreep** executes behaviors for each creep
   - Structure controllers manage towers, links, terminals, etc.

### Behavior System

Behaviors are executed in priority order defined in `config.creeps.js`. Each behavior:

1. **when()**: Returns true if the behavior should activate
2. **work()**: Performs the behavior's action
3. **completed()**: Returns true when the behavior is done

Behaviors transition automatically based on conditions.

### Resource Management

The transport system uses a priority-based matching algorithm:

- **givesResources()**: Finds structures/objects that can provide resources
- **needsResources()**: Finds structures/creeps that need resources
- Matches are made based on priority values (lower = higher priority)
- Transporters automatically handle resource distribution

## Performance Optimizations

- **Memhack**: Prevents memory re-parsing, saves CPU
- **Tick-level caching**: Enemies, repair structures, room structures cached per tick
- **Prototype extensions**: Efficient structure access via `room.towers`, `room.spawns`, etc.
- **Module caching**: Requires moved outside loop to prevent re-loading
- **Smart pathfinding**: Uses Traveler.js for efficient movement

## Contributing

This is a personal codebase, but improvements and optimizations are welcome!

## License

Personal project - see original author for license information.
