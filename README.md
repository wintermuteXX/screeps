# Screeps AI Codebase

A modular AI codebase for [Screeps](https://screeps.com) - an MMO strategy game where you program your units using JavaScript.

**Player:** utiuti  
**Original Codebase:** lethallic (inactive)  
**Status:** Actively maintained

## Overview

Modular architecture using a **Controller Pattern**:

```
ControllerGame
  └── ControllerRoom (per room)
      ├── ControllerSpawn, ControllerCreep
      ├── ControllerTower, ControllerLink
      ├── ControllerTerminal, ControllerFactory, ControllerLab
```

### Key Features

- **Modular Behavior System**: Priority-based behaviors with `when()`, `completed()`, and `work()` methods
- **Configuration-Driven**: Creep roles defined in `config.creeps.js`
- **Resource Management**: Priority-based transport system
- **Market Integration**: Automated trading via terminal
- **Factory & Lab Automation**: Commodity production and mineral reactions
- **Performance Optimized**: Memhack, tick-level caching, prototype extensions

## Quick Start

### Prerequisites

- Node.js 20+
- Screeps account

### Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/wintermuteXX/screeps.git
   cd screeps
   npm install
   ```

2. **Create `.screepsrc` with your credentials:**
   ```bash
   email=your@email.com
   password=yourpassword
   branch=default
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

## Project Structure

```
src/
├── main.js                 # Entry point
├── config.constants.js     # All game constants
├── config.creeps.js        # Creep role definitions
├── controller.*.js         # Room and structure controllers
├── behavior.*.js           # Creep behavior modules
├── service.*.js            # Services (planner, market, etc.)
├── lib.*.js                # Libraries (traveler, logging)
└── prototype.*.js          # Prototype extensions
```

## Configuration

### config.constants.js
Centralized constants: CPU thresholds, resource limits, priorities, tick intervals.

### config.creeps.js
Defines creep roles with:
- `priority`, `levelMin`, `levelMax`
- `canBuild()` function
- `body` array
- `behaviors` array

### Behaviors
Each behavior module exports:
- `when()` - When to activate
- `work()` - What to do
- `completed()` - When done

## How It Works

1. **main.js** initializes game loop
2. **ControllerGame** processes all rooms
3. For each room:
   - **ControllerSpawn** spawns creeps
   - **ControllerCreep** executes behaviors
   - Structure controllers manage towers, links, terminals, etc.

Behaviors execute in priority order, transitioning automatically based on conditions.

## Room Planner

The codebase includes an automatic room planner with bunker layout:

- **plannerVisualize(roomName)** - Visualize planned layout
- **plannerStats(roomName)** - Show layout statistics
- **plannerReset(roomName)** - Reset layout for replanning
- **plannerRun(roomName)** - Manually run planner
- **plannerOrphaned(roomName)** - List orphaned structures

## Performance

- **Memhack**: Prevents memory re-parsing
- **Tick-level caching**: Expensive operations cached per tick
- **Prototype extensions**: Efficient structure access
- **Smart pathfinding**: Traveler.js for movement

## License

Personal project - see original author for license information.
