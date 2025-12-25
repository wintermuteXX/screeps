/**
 * RoomPlanner - Automatic room planning and structure placement
 *
 * Creates an optimized layout for each room based on:
 * - Spawn position as center
 * - Room's RCL level (only available structures are built)
 * - Terrain analysis (avoids walls)
 *
 * Layout style: Compact "bunker" design for efficient defense
 */

const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

/**
 * RoomPlanner Constants - now imported from config.constants.js
 * Use CONSTANTS.PLANNER.* instead of PLANNER_CONSTANTS.*
 */

/**
 * Structure limits per RCL (from Screeps API)
 * These are used to check if a structure can be built
 */
const CONTROLLER_STRUCTURES = {
  [STRUCTURE_SPAWN]: { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 3 },
  [STRUCTURE_EXTENSION]: { 0: 0, 1: 0, 2: 5, 3: 10, 4: 20, 5: 30, 6: 40, 7: 50, 8: 60 },
  [STRUCTURE_ROAD]: { 0: 2500, 1: 2500, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
  [STRUCTURE_WALL]: { 0: 0, 1: 0, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
  [STRUCTURE_RAMPART]: { 0: 0, 1: 0, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
  [STRUCTURE_LINK]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 2, 6: 3, 7: 4, 8: 6 },
  [STRUCTURE_STORAGE]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
  [STRUCTURE_TOWER]: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 6 },
  [STRUCTURE_OBSERVER]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
  [STRUCTURE_POWER_SPAWN]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
  [STRUCTURE_EXTRACTOR]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1 },
  [STRUCTURE_TERMINAL]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1 },
  [STRUCTURE_LAB]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 3, 7: 6, 8: 10 },
  [STRUCTURE_CONTAINER]: { 0: 5, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5 },
  [STRUCTURE_NUKER]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
  [STRUCTURE_FACTORY]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 1 },
};

/**
 * Structure Type Mapping for Layout Generation
 */
const STRUCTURE_TYPE_MAP = {
  spawns: STRUCTURE_SPAWN,
  storage: STRUCTURE_STORAGE,
  terminal: STRUCTURE_TERMINAL,
  factory: STRUCTURE_FACTORY,
  towers: STRUCTURE_TOWER,
  extensions: STRUCTURE_EXTENSION,
  labs: STRUCTURE_LAB,
  links: STRUCTURE_LINK,
  observer: STRUCTURE_OBSERVER,
  powerSpawn: STRUCTURE_POWER_SPAWN,
  nuker: STRUCTURE_NUKER,
  roads: STRUCTURE_ROAD,
};

/**
 * Bunker Layout Definition
 * Positions relative to center (0,0)
 * Format: { x: offsetX, y: offsetY, structureType: STRUCTURE_TYPE, priority: number }
 * Priority determines build order (lower = earlier)
 */
const BUNKER_LAYOUT = {
  // Spawn in center (used as reference point)
  spawns: [
    { x: 0, y: 0, priority: 1 },
    { x: -2, y: 2, priority: 100 },
    { x: 2, y: 2, priority: 101 },
  ],

  // Storage central for short paths
  storage: [{ x: 0, y: 1, priority: 10 }],

  // Terminal next to Storage
  terminal: [{ x: 1, y: 1, priority: 20 }],

  // Factory next to Terminal
  // factory: [{ x: -1, y: 1, priority: 25 }],

  // Towers in strategic positions (protection of the core)
  towers: [
    { x: 1, y: -1, priority: 5 },
    { x: -1, y: -1, priority: 6 },
    { x: 2, y: 0, priority: 30 },
    { x: -2, y: 0, priority: 31 },
    { x: 0, y: -2, priority: 32 },
    { x: 0, y: 2, priority: 33 },
  ],

  // Extensions in an efficient pattern around the core
  extensions: [
    // Ring 1 (RCL 2-3)
    { x: -1, y: -2, priority: 11 },
    { x: 1, y: -2, priority: 12 },
    { x: -2, y: -1, priority: 13 },
    { x: 3, y: -3, priority: 14 },
    { x: -2, y: 1, priority: 15 },
    // Ring 2 (RCL 3-4)
    { x: -3, y: 3, priority: 16 },
    { x: -3, y: 0, priority: 17 },
    { x: 3, y: 0, priority: 18 },
    { x: 0, y: -3, priority: 19 },
    { x: 0, y: 3, priority: 21 },
    // Ring 3 (RCL 4-5)
    { x: -3, y: -1, priority: 22 },
    { x: 3, y: -1, priority: 23 },
    { x: -3, y: 1, priority: 24 },
    { x: 3, y: 1, priority: 26 },
    { x: -1, y: -3, priority: 27 },
    { x: 1, y: -3, priority: 28 },
    { x: -1, y: 3, priority: 29 },
    { x: 1, y: 3, priority: 34 },
    { x: -2, y: -2, priority: 35 },
    { x: 2, y: -2, priority: 36 },
    // Ring 4 (RCL 5-6)
    { x: -4, y: 0, priority: 37 },
    { x: 4, y: 0, priority: 38 },
    { x: 0, y: -4, priority: 39 },
    { x: 0, y: 4, priority: 40 },
    { x: -3, y: -2, priority: 41 },
    { x: 3, y: -2, priority: 42 },
    { x: -3, y: 2, priority: 43 },
    { x: 3, y: 2, priority: 44 },
    { x: -2, y: -3, priority: 45 },
    { x: 2, y: -3, priority: 46 },
    // Ring 5 (RCL 6-7)
    { x: -2, y: 3, priority: 47 },
    { x: 2, y: 3, priority: 48 },
    { x: -4, y: -1, priority: 49 },
    { x: 4, y: -1, priority: 50 },
    { x: -4, y: 1, priority: 51 },
    { x: 4, y: 1, priority: 52 },
    { x: -1, y: -4, priority: 53 },
    { x: 1, y: -4, priority: 54 },
    { x: -1, y: 4, priority: 55 },
    { x: 1, y: 4, priority: 56 },
    // Ring 6 (RCL 7-8)
    { x: -4, y: -2, priority: 57 },
    { x: 4, y: -2, priority: 58 },
    { x: -4, y: 2, priority: 59 },
    { x: 4, y: 2, priority: 60 },
    { x: -2, y: -4, priority: 61 },
    { x: 2, y: -4, priority: 62 },
    { x: -2, y: 4, priority: 63 },
    { x: 2, y: 4, priority: 64 },
    { x: -5, y: 0, priority: 65 },
    { x: 5, y: 0, priority: 66 },
    // Additional extensions for RCL 8
    { x: 0, y: -5, priority: 71 },
    { x: 0, y: 5, priority: 72 },
    { x: -4, y: -3, priority: 73 },
    { x: 4, y: -3, priority: 74 },
  ],

  // Labs in a compact cluster (for reactions)
  labs: [
    { x: 3, y: 3, priority: 75 },
    { x: 4, y: 3, priority: 76 },
    { x: 5, y: 3, priority: 77 },
    { x: 3, y: 4, priority: 78 },
    { x: 4, y: 4, priority: 79 },
    { x: 5, y: 4, priority: 80 },
    { x: 3, y: 5, priority: 81 },
    { x: 4, y: 5, priority: 82 },
    { x: 5, y: 5, priority: 83 },
    { x: 6, y: 4, priority: 84 },
  ],

  // Links in strategic positions
  links: [
    { x: 2, y: -1, priority: 86 }, // At spawn
    // Additional links are placed dynamically at Sources/Controller
  ],

  // Observer
  observer: [{ x: -3, y: -3, priority: 95 }],

  // Power Spawn
  // powerSpawn: [{ x: -1, y: 2, priority: 96 }],

  // Nuker (far from center)
  nuker: [{ x: -4, y: 3, priority: 97 }],

  // Roads (main paths)
  roads: [
    // Cross through the center
    { x: 0, y: -1, priority: 200 },
    { x: 2, y: 5, priority: 213 },
    { x: 2, y: 6, priority: 214 },
    // Vertical paths between lab columns (x=2, x=6)
    { x: 5, y: 2, priority: 216 },
    { x: 6, y: 2, priority: 217 },
    // Paths around the lab cluster perimeter (bottom row)
    { x: 3, y: 6, priority: 218 },
    { x: 4, y: 6, priority: 219 },
    { x: 5, y: 6, priority: 220 },
    { x: 6, y: 6, priority: 221 },
    // Connection to additional lab at (6,4) - roads around it
    { x: 7, y: 3, priority: 222 },
    { x: 7, y: 4, priority: 223 },
    { x: 7, y: 5, priority: 224 },
  ],
};

/**
 * RoomPlanner Class
 */
function RoomPlanner(room) {
  this.room = room;
  this.roomName = room.name;
  this.memory = this._initMemory();
}

/**
 * Initializes the memory for the room
 */
RoomPlanner.prototype._initMemory = function () {
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[this.roomName]) {
    Memory.rooms[this.roomName] = {};
  }
  if (!Memory.rooms[this.roomName].planner) {
    Memory.rooms[this.roomName].planner = {
      centerX: null,
      centerY: null,
      layoutGenerated: false,
      plannedStructures: [],
      visualizeUntil: null,
    };
  }
  return Memory.rooms[this.roomName].planner;
};

/**
 * Main function - Plans and builds structures
 */
RoomPlanner.prototype.run = function () {
  // Only for own rooms with controller
  if (!this.room.controller || !this.room.controller.my) {
    return;
  }

  const rcl = this.room.controller.level;

  // Determine center (based on first spawn)
  if (!this._hasCenter()) {
    this._findCenter();
  }

  // Generate layout if not already done
  if (!this.memory.layoutGenerated && this._hasCenter()) {
    this._generateLayout();
  }

  // Construction Sites platzieren
  if (this.memory.layoutGenerated) {
    this._placeConstructionSites(rcl);
  }

  // Place special structures (Extractor, Container at Sources)
  this._placeSpecialStructures(rcl);

  // Draw visualization if active
  if (this.memory.visualizeUntil && Game.time <= this.memory.visualizeUntil) {
    this._drawVisualization();
    // Auto-disable after 15 ticks
    if (Game.time >= this.memory.visualizeUntil) {
      this.memory.visualizeUntil = null;
    }
  }
};

/**
 * Checks if a center is defined
 */
RoomPlanner.prototype._hasCenter = function () {
  return this.memory.centerX !== null && this.memory.centerY !== null;
};

/**
 * Findet das Zentrum basierend auf dem ersten Spawn
 */
RoomPlanner.prototype._findCenter = function () {
  const spawns = this.room.find(FIND_MY_SPAWNS);

  if (spawns.length > 0) {
    // Use first spawn as center
    this.memory.centerX = spawns[0].pos.x;
    this.memory.centerY = spawns[0].pos.y;
    Log.info(
      `RoomPlanner: Center for ${this.roomName} found at (${this.memory.centerX}, ${this.memory.centerY})`,
      "RoomPlanner",
    );
    return true;
  }

  // No spawn present - try to find optimal position
  const centerPos = this._calculateOptimalCenter();
  if (centerPos) {
    this.memory.centerX = centerPos.x;
    this.memory.centerY = centerPos.y;
    Log.info(
      `RoomPlanner: Optimal center for ${this.roomName} calculated at (${this.memory.centerX}, ${this.memory.centerY})`,
      "RoomPlanner",
    );
    return true;
  }

  return false;
};

/**
 * Calculates the optimal center position
 */
RoomPlanner.prototype._calculateOptimalCenter = function () {
  const sources = this.room.find(FIND_SOURCES);
  const {controller} = this.room;

  if (!controller) return null;

  let bestPos = null;
  let bestScore = Infinity;

  // Search through possible positions
  for (let x = CONSTANTS.PLANNER.CENTER_SEARCH_MIN; x < CONSTANTS.PLANNER.CENTER_SEARCH_MAX; x++) {
    for (let y = CONSTANTS.PLANNER.CENTER_SEARCH_MIN; y < CONSTANTS.PLANNER.CENTER_SEARCH_MAX; y++) {
      // Check if position and surroundings are free
      if (!this._isValidCenterPosition(x, y)) continue;

      // Calculate score (sum of distances to sources and controller)
      let score = 0;
      const pos = new RoomPosition(x, y, this.roomName);

      for (const source of sources) {
        score += pos.getRangeTo(source.pos);
      }
      score += pos.getRangeTo(controller.pos) * CONSTANTS.PLANNER.CONTROLLER_WEIGHT;

      if (score < bestScore) {
        bestScore = score;
        bestPos = { x, y };
      }
    }
  }

  return bestPos;
};

/**
 * Checks if a position is suitable as center
 */
RoomPlanner.prototype._isValidCenterPosition = function (x, y) {
  const terrain = this.room.getTerrain();
  const range = CONSTANTS.PLANNER.CENTER_FREE_RANGE;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const checkX = x + dx;
      const checkY = y + dy;

      // Border check
      if (
        checkX < CONSTANTS.PLANNER.ROOM_EDGE_MIN ||
        checkX > CONSTANTS.PLANNER.ROOM_EDGE_MAX ||
        checkY < CONSTANTS.PLANNER.ROOM_EDGE_MIN ||
        checkY > CONSTANTS.PLANNER.ROOM_EDGE_MAX
      ) {
        return false;
      }

      // Wall check
      if (terrain.get(checkX, checkY) === TERRAIN_MASK_WALL) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Generiert das Layout basierend auf dem Bunker-Design
 */
RoomPlanner.prototype._generateLayout = function () {
  const {centerX} = this.memory;
  const {centerY} = this.memory;
  const terrain = this.room.getTerrain();
  const plannedStructures = [];

  // Helper function to add a structure
  const addStructure = (offsetX, offsetY, structureType, priority) => {
    const x = centerX + offsetX;
    const y = centerY + offsetY;

    // Border check
    if (
      x < CONSTANTS.PLANNER.ROOM_MIN ||
      x > CONSTANTS.PLANNER.ROOM_MAX ||
      y < CONSTANTS.PLANNER.ROOM_MIN ||
      y > CONSTANTS.PLANNER.ROOM_MAX
    )
      return;

    // Wall check
    if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
      // Try to find alternative position
      const altPos = this._findAlternativePosition(x, y, structureType);
      if (altPos) {
        plannedStructures.push({
          x: altPos.x,
          y: altPos.y,
          structureType,
          priority,
        });
      }
      return;
    }

    plannedStructures.push({ x, y, structureType, priority });
  };

  // Add all structures from layout (except roads, which are handled separately)
  const structureKeys = [
    "spawns",
    "storage",
    "terminal",
    "factory",
    "towers",
    "extensions",
    "labs",
    "links",
    "observer",
    "powerSpawn",
    "nuker",
  ];

  for (const key of structureKeys) {
    const structureType = STRUCTURE_TYPE_MAP[key];
    if (!structureType) continue;

    // Prüfe ob BUNKER_LAYOUT[key] existiert, bevor forEach aufgerufen wird
    if (!BUNKER_LAYOUT[key]) continue;

    BUNKER_LAYOUT[key].forEach((pos) => {
      addStructure(pos.x, pos.y, structureType, pos.priority);
    });
  }

  // Roads - only add if position is not already occupied by another structure
  BUNKER_LAYOUT.roads.forEach((pos) => {
    const roadX = centerX + pos.x;
    const roadY = centerY + pos.y;

    // Check if this position is already planned for a non-road structure
    const isOccupied = plannedStructures.some(
      (s) => s.x === roadX && s.y === roadY && s.structureType !== STRUCTURE_ROAD,
    );

    // Only add road if position is free (no other structure planned there)
    if (!isOccupied) {
      addStructure(pos.x, pos.y, STRUCTURE_ROAD, pos.priority);
    }
  });

  // Sort by priority
  plannedStructures.sort((a, b) => a.priority - b.priority);

  this.memory.plannedStructures = plannedStructures;
  this.memory.layoutGenerated = true;

  Log.success(
    `RoomPlanner: Layout for ${this.roomName} generated with ${plannedStructures.length} structures`,
    "RoomPlanner",
  );
};

/**
 * Finds an alternative position when the desired one is blocked
 */
RoomPlanner.prototype._findAlternativePosition = function (x, y, structureType) {
  const terrain = this.room.getTerrain();
  const range = CONSTANTS.PLANNER.ALTERNATIVE_POSITION_RANGE;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const newX = x + dx;
      const newY = y + dy;

      if (
        newX < CONSTANTS.PLANNER.ROOM_MIN ||
        newX > CONSTANTS.PLANNER.ROOM_MAX ||
        newY < CONSTANTS.PLANNER.ROOM_MIN ||
        newY > CONSTANTS.PLANNER.ROOM_MAX
      )
        continue;
      if (terrain.get(newX, newY) === TERRAIN_MASK_WALL) continue;

      // Check if position is already occupied
      const structures = this.room.lookForAt(LOOK_STRUCTURES, newX, newY);
      const sites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, newX, newY);

      if (structures.length === 0 && sites.length === 0) {
        return { x: newX, y: newY };
      }
    }
  }

  return null;
};

/**
 * Platziert Construction Sites basierend auf RCL
 */
RoomPlanner.prototype._placeConstructionSites = function (rcl) {
  const existingSites = this.room.find(FIND_CONSTRUCTION_SITES);

  // Limit for Construction Sites (max 100 per room, but we limit to fewer for efficiency)
  if (existingSites.length >= CONSTANTS.PLANNER.MAX_CONSTRUCTION_SITES) {
    return;
  }

  // Cache structure counts by type (CPU optimization - find only once)
  const structureCounts = this._getStructureCounts();

  let sitesPlaced = 0;

  for (const planned of this.memory.plannedStructures) {
    if (sitesPlaced >= CONSTANTS.PLANNER.MAX_CONSTRUCTION_SITES - existingSites.length) break;

    const { x, y, structureType } = planned;

    // Skip special structures (Container/Links) - they are handled by _placeSpecialStructures
    if (planned.specialIdentifier) {
      continue;
    }

    // Check if structure can be built at current RCL
    if (!this._canBuildStructure(structureType, rcl, structureCounts)) {
      continue;
    }

    // Check if structure or construction site already exists
    const pos = new RoomPosition(x, y, this.roomName);
    const existingStructures = pos.lookFor(LOOK_STRUCTURES);
    const existingConstSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

    // For roads: check if there's already a non-road structure or site at this position
    if (structureType === STRUCTURE_ROAD) {
      const hasNonRoadStructure = existingStructures.some(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART,
      );
      const hasNonRoadSite = existingConstSites.some(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART,
      );
      if (hasNonRoadStructure || hasNonRoadSite) {
        continue; // Don't place road under other structures
      }
      // Check if road already exists
      const hasRoad = existingStructures.some((s) => s.structureType === STRUCTURE_ROAD);
      const hasRoadSite = existingConstSites.some((s) => s.structureType === STRUCTURE_ROAD);
      if (hasRoad || hasRoadSite) {
        continue;
      }
    } else {
      // For non-road structures: check if structure of this type already exists
      const hasStructure = existingStructures.some(
        (s) =>
          s.structureType === structureType || (s.structureType !== STRUCTURE_ROAD && structureType !== STRUCTURE_ROAD),
      );
      const hasSite = existingConstSites.some((s) => s.structureType === structureType);
      if (hasStructure || hasSite) {
        continue;
      }

      // Check if there's a blocking non-road, non-rampart structure
      const blockingStructure = existingStructures.find(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART,
      );
      if (blockingStructure) {
        continue;
      }
    }

    // Try to place construction site
    const result = this.room.createConstructionSite(x, y, structureType);

    if (result === OK) {
      sitesPlaced++;
      Log.debug(`RoomPlanner: Construction site for ${structureType} placed at (${x}, ${y})`, "RoomPlanner");
    } else if (result === ERR_FULL) {
      // Already too many sites
      break;
    } else if (result !== ERR_INVALID_TARGET && result !== ERR_RCL_NOT_ENOUGH) {
      Log.warn(
        `RoomPlanner: Could not place ${structureType} at (${x}, ${y}). Error: ${global.getErrorString(result)}`,
        "RoomPlanner",
      );
    }
  }
};

/**
 * Cache structure and site counts by type (CPU optimization)
 */
RoomPlanner.prototype._getStructureCounts = function () {
  if (this._structureCounts) {
    return this._structureCounts;
  }

  this._structureCounts = {};

  // Count structures by type
  const structures = this.room.find(FIND_STRUCTURES);
  for (const s of structures) {
    const type = s.structureType;
    this._structureCounts[type] = (this._structureCounts[type] || 0) + 1;
  }

  // Count construction sites by type
  const sites = this.room.find(FIND_CONSTRUCTION_SITES);
  for (const s of sites) {
    const type = s.structureType;
    this._structureCounts[type] = (this._structureCounts[type] || 0) + 1;
  }

  return this._structureCounts;
};

/**
 * Checks if a structure can be built at the given RCL
 */
RoomPlanner.prototype._canBuildStructure = function (structureType, rcl, structureCounts) {
  // Roads are only built from minimum RCL onwards
  if (structureType === STRUCTURE_ROAD && rcl < CONSTANTS.PLANNER.MIN_RCL_FOR_ROADS) {
    return false;
  }

  // Number of allowed structures at this RCL
  const maxAllowed = CONTROLLER_STRUCTURES[structureType] ? CONTROLLER_STRUCTURES[structureType][rcl] : 0;

  if (maxAllowed === 0) {
    return false;
  }

  // Use cached counts if provided, otherwise calculate (for external calls)
  const totalCount = structureCounts
    ? structureCounts[structureType] || 0
    : this._getStructureCounts()[structureType] || 0;

  return totalCount < maxAllowed;
};

/**
 * Platziert spezielle Strukturen (Extractor, Container bei Sources/Controller)
 */
RoomPlanner.prototype._placeSpecialStructures = function (rcl) {
  // Extractor at mineral (RCL 6+)
  if (rcl >= 6) {
    this._placeExtractor();
  }

  // Container at sources (from RCL 3)
  this._placeSourceContainers();

  // Container beim Controller (ab RCL 3)
  this._placeControllerContainer();

  // Links at sources (RCL 5+)
  if (rcl >= 5) {
    this._placeSourceLinks();
  }

  // Link beim Controller (RCL 5+)
  if (rcl >= 5) {
    this._placeControllerLink();
  }
};

/**
 * Platziert Extractor beim Mineral
 */
RoomPlanner.prototype._placeExtractor = function () {
  const minerals = this.room.find(FIND_MINERALS);
  if (minerals.length === 0) return;

  const mineral = minerals[0];

  // Check if extractor already exists
  const existingExtractor = mineral.pos.lookFor(LOOK_STRUCTURES).find((s) => s.structureType === STRUCTURE_EXTRACTOR);
  const existingSite = mineral.pos
    .lookFor(LOOK_CONSTRUCTION_SITES)
    .find((s) => s.structureType === STRUCTURE_EXTRACTOR);

  if (!existingExtractor && !existingSite) {
    const result = this.room.createConstructionSite(mineral.pos, STRUCTURE_EXTRACTOR);
    if (result === OK) {
      Log.debug("RoomPlanner: Extractor construction site placed at mineral", "RoomPlanner");
    }
  }

  // Container next to mineral
  this._placeContainerNear(mineral.pos, "mineral", "mineral", mineral.id);
};

/**
 * Platziert Container bei Sources
 */
RoomPlanner.prototype._placeSourceContainers = function () {
  const sources = this.room.find(FIND_SOURCES);

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const identifier = `source_${i}`;
    this._placeContainerNear(source.pos, "source", identifier, source.id);
  }
};

/**
 * Platziert Container beim Controller
 */
RoomPlanner.prototype._placeControllerContainer = function () {
  if (!this.room.controller) return;
  this._placeContainerNear(this.room.controller.pos, "controller", "controller", this.room.controller.id);
};

/**
 * Places a container near a position (statisch im Memory)
 */
RoomPlanner.prototype._placeContainerNear = function (pos, type, identifier, targetId) {
  // Container erst ab konfiguriertem RCL bauen (Standard: RCL 3)
  if (this.room.controller.level < CONSTANTS.CONTAINER.MIN_RCL) {
    return;
  }

  const range =
    type === "controller" ? CONSTANTS.PLANNER.CONTAINER_CONTROLLER_RANGE : CONSTANTS.PLANNER.CONTAINER_DEFAULT_RANGE;
  this._placeStructureNear(pos, STRUCTURE_CONTAINER, range, type, false, identifier, targetId);
};

/**
 * Platziert Links bei Sources
 */
RoomPlanner.prototype._placeSourceLinks = function () {
  const sources = this.room.find(FIND_SOURCES);

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const identifier = `source_link_${i}`;
    this._placeLinkNear(source.pos, "source", identifier, source.id);
  }
};

/**
 * Platziert Link beim Controller
 */
RoomPlanner.prototype._placeControllerLink = function () {
  if (!this.room.controller) return;
  this._placeLinkNear(this.room.controller.pos, "controller", "controller_link", this.room.controller.id);
};

/**
 * Places a link near a position (statisch im Memory)
 */
RoomPlanner.prototype._placeLinkNear = function (pos, type, identifier, targetId) {
  const range = CONSTANTS.PLANNER.LINK_PLACEMENT_RANGE;
  this._placeStructureNear(pos, STRUCTURE_LINK, range, type, true, identifier, targetId);
};

/**
 * Generic function to place a structure near a position (statisch im Memory)
 * @param {RoomPosition} pos - Target position
 * @param {string} structureType - Type of structure to place
 * @param {number} range - Search range around position
 * @param {string} type - Type identifier for logging (e.g., "source", "controller")
 * @param {boolean} allowRoads - Whether roads/ramparts are allowed at the position
 * @param {string} identifier - Unique identifier for this structure (e.g., "source_0", "controller")
 * @param {string} targetId - ID of the target (source/controller) this structure is associated with
 */
RoomPlanner.prototype._placeStructureNear = function (
  pos,
  structureType,
  range,
  type,
  allowRoads,
  identifier,
  targetId,
) {
  // Check if position is already stored in memory
  const storedPosition = this._getStoredSpecialStructure(identifier);

  if (storedPosition) {
    // Use stored position
    const storedPos = new RoomPosition(storedPosition.x, storedPosition.y, this.roomName);

    // Check if structure still exists at stored position
    const structures = storedPos.lookFor(LOOK_STRUCTURES);
    const sites = storedPos.lookFor(LOOK_CONSTRUCTION_SITES);

    const hasStructure = structures.some((s) => s.structureType === structureType);
    const hasSite = sites.some((s) => s.structureType === structureType);

    if (hasStructure || hasSite) {
      // Structure exists or is being built - nothing to do
      return;
    }

    // Structure was destroyed - rebuild at stored position
    // Check if position is still valid
    const terrain = this.room.getTerrain();
    if (terrain.get(storedPos.x, storedPos.y) === TERRAIN_MASK_WALL) {
      // Position is now a wall - need to find new position
      Log.warn(`RoomPlanner: Stored position for ${identifier} is now a wall, finding new position`, "RoomPlanner");
      this._removeStoredSpecialStructure(identifier);
      // Fall through to find new position
    } else {
      // Check if position is blocked by other structures
      const blockingStructures = structures.filter((s) =>
        allowRoads ? s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART : true,
      );
      const blockingSites = sites.filter((s) =>
        allowRoads ? s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART : true,
      );

      if (blockingStructures.length === 0 && blockingSites.length === 0) {
        // Position is free - rebuild here
        const result = this.room.createConstructionSite(storedPos, structureType);
        if (result === OK) {
          const structureName = structureType === STRUCTURE_CONTAINER ? "Container" : "Link";
          Log.debug(
            `RoomPlanner: ${structureName} construction site placed at stored position (${storedPos.x}, ${storedPos.y}) for ${type}`,
            "RoomPlanner",
          );
        }
        return;
      } else {
        // Position is blocked - need to find new position
        Log.warn(`RoomPlanner: Stored position for ${identifier} is blocked, finding new position`, "RoomPlanner");
        this._removeStoredSpecialStructure(identifier);
        // Fall through to find new position
      }
    }
  }

  // No stored position or stored position invalid - find new position
  // Check if structure already exists in range (might have been placed manually)
  const nearbyStructures = pos.findInRange(FIND_STRUCTURES, range, {
    filter: (s) => s && "structureType" in s && s.structureType === structureType,
  });

  const nearbySites = pos.findInRange(FIND_CONSTRUCTION_SITES, range, {
    filter: (s) => s && "structureType" in s && s.structureType === structureType,
  });

  if (nearbyStructures.length > 0 || nearbySites.length > 0) {
    // Structure exists nearby - store its position
    const existingPos = nearbyStructures.length > 0 ? nearbyStructures[0].pos : nearbySites[0].pos;
    this._storeSpecialStructure(identifier, existingPos.x, existingPos.y, structureType, targetId);
    return;
  }

  // Check if structure limit reached
  if (!this._canBuildStructure(structureType, this.room.controller.level)) {
    return;
  }

  // Find best position for structure
  const terrain = this.room.getTerrain();
  let bestPos = null;
  let bestScore = Infinity;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;

      const x = pos.x + dx;
      const y = pos.y + dy;

      if (
        x < CONSTANTS.PLANNER.ROOM_MIN ||
        x > CONSTANTS.PLANNER.ROOM_MAX ||
        y < CONSTANTS.PLANNER.ROOM_MIN ||
        y > CONSTANTS.PLANNER.ROOM_MAX
      )
        continue;
      if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

      const checkPos = new RoomPosition(x, y, this.roomName);

      // Check if position is free
      const structures = checkPos.lookFor(LOOK_STRUCTURES);
      const sites = checkPos.lookFor(LOOK_CONSTRUCTION_SITES);

      if (allowRoads) {
        // For links: allow roads/ramparts, but block other structures
        const hasBlockingStructure = structures.some(
          (s) => s.structureType && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART,
        );
        const hasBlockingSite = sites.some(
          (s) => s.structureType && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART,
        );
        if (hasBlockingStructure || hasBlockingSite) continue;
      } else {
        // For containers: no structures or sites allowed
        if (structures.length > 0 || sites.length > 0) continue;
      }

      // Score: Distance to center (if available)
      let score = 0;
      if (this._hasCenter()) {
        const centerPos = new RoomPosition(this.memory.centerX, this.memory.centerY, this.roomName);
        score = checkPos.getRangeTo(centerPos);
      }

      if (score < bestScore) {
        bestScore = score;
        bestPos = checkPos;
      }
    }
  }

  if (bestPos) {
    const result = this.room.createConstructionSite(bestPos, structureType);
    if (result === OK) {
      const structureName = structureType === STRUCTURE_CONTAINER ? "Container" : "Link";
      Log.debug(
        `RoomPlanner: ${structureName} construction site placed at ${type} (${bestPos.x}, ${bestPos.y})`,
        "RoomPlanner",
      );

      // Store position in memory
      this._storeSpecialStructure(identifier, bestPos.x, bestPos.y, structureType, targetId);
    }
  }
};

/**
 * Stores a special structure (Container/Link) position in memory
 */
RoomPlanner.prototype._storeSpecialStructure = function (identifier, x, y, structureType, targetId) {
  // Ensure plannedStructures exists
  if (!this.memory.plannedStructures) {
    this.memory.plannedStructures = [];
  }

  // Remove existing entry with same identifier
  this.memory.plannedStructures = this.memory.plannedStructures.filter(
    (s) => !(s.specialIdentifier && s.specialIdentifier === identifier),
  );

  // Add new entry with special identifier
  // Priority assignment:
  // - Containers: 1000+
  // - First source link (source_link_0): 85 (before spawn link at 86)
  // - Spawn link: 86 (from BUNKER_LAYOUT)
  // - Other source links and controller link: 87+
  let priority;
  if (structureType === STRUCTURE_CONTAINER) {
    priority = 1000;
  } else if (structureType === STRUCTURE_LINK) {
    if (identifier === "source_link_0") {
      priority = 85; // First source link - before spawn link
    } else if (identifier.startsWith("source_link_")) {
      // Other source links - after spawn link
      const linkIndex = parseInt(identifier.split("_")[2]) || 0;
      priority = 87 + linkIndex; // 87, 88, etc.
    } else if (identifier === "controller_link") {
      priority = 90; // Controller link - after all source links
    } else {
      priority = 1100; // Fallback for other links
    }
  } else {
    priority = 1100; // Fallback
  }

  this.memory.plannedStructures.push({
    x: x,
    y: y,
    structureType: structureType,
    priority: priority,
    specialIdentifier: identifier,
    targetId: targetId,
  });

  Log.debug(
    `RoomPlanner: Stored ${structureType} position (${x}, ${y}) for ${identifier} with priority ${priority}`,
    "RoomPlanner",
  );
};

/**
 * Gets stored special structure position from memory
 */
RoomPlanner.prototype._getStoredSpecialStructure = function (identifier) {
  if (!this.memory.plannedStructures) {
    return null;
  }

  const stored = this.memory.plannedStructures.find((s) => s.specialIdentifier && s.specialIdentifier === identifier);

  return stored ? { x: stored.x, y: stored.y, structureType: stored.structureType } : null;
};

/**
 * Removes stored special structure from memory
 */
RoomPlanner.prototype._removeStoredSpecialStructure = function (identifier) {
  if (!this.memory.plannedStructures) {
    return;
  }

  this.memory.plannedStructures = this.memory.plannedStructures.filter(
    (s) => !(s.specialIdentifier && s.specialIdentifier === identifier),
  );
};

/**
 * Activates visualization for 15 ticks
 */
RoomPlanner.prototype.visualize = function () {
  if (!this.memory.layoutGenerated) {
    Log.warn(`Cannot visualize: Layout not generated for ${this.roomName}`, "RoomPlanner");
    return;
  }

  // Activate visualization
  this.memory.visualizeUntil = Game.time + CONSTANTS.PLANNER.VISUALIZATION_DURATION;
  this._drawVisualization();
  Log.info(
    `Visualization activated for ${this.roomName} (${CONSTANTS.PLANNER.VISUALIZATION_DURATION} ticks)`,
    "RoomPlanner",
  );
};

/**
 * Draws the visualization (internal method)
 */
RoomPlanner.prototype._drawVisualization = function () {
  if (!this.memory.layoutGenerated) return;

  const {visual} = this.room;

  // Structure colors - each structure type has a unique color
  const structureColors = {
    [STRUCTURE_SPAWN]: "#ffff00",
    [STRUCTURE_EXTENSION]: "#888888",
    [STRUCTURE_TOWER]: "#ff0000",
    [STRUCTURE_STORAGE]: "#00ffff",
    [STRUCTURE_TERMINAL]: "#ff00ff",
    [STRUCTURE_LAB]: "#00ff00",
    [STRUCTURE_LINK]: "#0088ff",
    [STRUCTURE_FACTORY]: "#ffaa00",
    [STRUCTURE_OBSERVER]: "#ffffff",
    [STRUCTURE_POWER_SPAWN]: "#ff8800",
    [STRUCTURE_NUKER]: "#880000",
    [STRUCTURE_ROAD]: "#aaaaaa",
    [STRUCTURE_CONTAINER]: "#00aa00",
  };

  // Structure names for legend
  const structureNames = {
    [STRUCTURE_SPAWN]: "Spawn",
    [STRUCTURE_EXTENSION]: "Extension",
    [STRUCTURE_TOWER]: "Tower",
    [STRUCTURE_STORAGE]: "Storage",
    [STRUCTURE_TERMINAL]: "Terminal",
    [STRUCTURE_LAB]: "Lab",
    [STRUCTURE_LINK]: "Link",
    [STRUCTURE_FACTORY]: "Factory",
    [STRUCTURE_OBSERVER]: "Observer",
    [STRUCTURE_POWER_SPAWN]: "PowerSpawn",
    [STRUCTURE_NUKER]: "Nuker",
    [STRUCTURE_ROAD]: "Road",
    [STRUCTURE_CONTAINER]: "Container",
  };

  // Structure initial letters for visualization
  const structureLetters = {
    [STRUCTURE_SPAWN]: "S",
    [STRUCTURE_EXTENSION]: "E",
    [STRUCTURE_TOWER]: "T",
    [STRUCTURE_STORAGE]: "St",
    [STRUCTURE_TERMINAL]: "Te",
    [STRUCTURE_LAB]: "L",
    [STRUCTURE_LINK]: "Li",
    [STRUCTURE_FACTORY]: "F",
    [STRUCTURE_OBSERVER]: "O",
    [STRUCTURE_POWER_SPAWN]: "P",
    [STRUCTURE_NUKER]: "N",
    [STRUCTURE_ROAD]: "R",
    [STRUCTURE_CONTAINER]: "C",
  };

  // Draw center
  if (this._hasCenter()) {
    visual.circle(this.memory.centerX, this.memory.centerY, {
      fill: "transparent",
      stroke: "#00ff00",
      strokeWidth: 0.2,
      radius: 0.5,
    });
  }

  // Collect unique structure types for legend
  const usedStructures = new Set();
  for (const planned of this.memory.plannedStructures) {
    usedStructures.add(planned.structureType);
  }

  // Draw legend in top-left corner (doubled size)
  let legendY = 1;
  const legendWidth = 8;
  const legendItemHeight = 1;
  visual.rect(0.5, 0.5, legendWidth, usedStructures.size * legendItemHeight + 1, {
    fill: "#000000",
    opacity: 0.7,
    stroke: "#ffffff",
    strokeWidth: 0.2,
  });

  for (const structureType of usedStructures) {
    const color = structureColors[structureType] || "#ffffff";
    const name = structureNames[structureType] || structureType;

    // Color square (doubled size)
    visual.rect(0.8, legendY, 0.6, 0.6, {
      fill: color,
      opacity: 1,
      stroke: color,
      strokeWidth: 0.2,
    });

    // Text label: "Farbe = Extension" format (doubled size)
    visual.text(`= ${name}`, 1.6, legendY + 0.4, {
      color: "#ffffff",
      font: "0.8 Arial",
      align: "left",
    });

    legendY += legendItemHeight;
  }

  // Draw planned structures
  for (const planned of this.memory.plannedStructures) {
    const color = structureColors[planned.structureType] || "#ffffff";
    visual.rect(planned.x - 0.4, planned.y - 0.4, 0.8, 0.8, {
      fill: color,
      opacity: 0.8,
      stroke: color,
      strokeWidth: 0.1,
    });

    // Draw structure initial letter
    const letter = structureLetters[planned.structureType] || "?";
    visual.text(letter, planned.x, planned.y + 0.3, {
      color: "#000000",
      font: "0.6 Arial",
      align: "center",
      stroke: "#ffffff",
      strokeWidth: 0.1,
    });
  }
};

/**
 * Resets the layout (for replanning)
 */
RoomPlanner.prototype.reset = function () {
  this.memory.centerX = null;
  this.memory.centerY = null;
  this.memory.layoutGenerated = false;
  this.memory.plannedStructures = [];
  Log.info(`RoomPlanner: Layout for ${this.roomName} reset`, "RoomPlanner");
};

/**
 * Returns statistics about the planned layout
 */
RoomPlanner.prototype.getStats = function () {
  if (!this.memory.layoutGenerated) {
    return { status: "nicht generiert" };
  }

  const stats = {
    center: { x: this.memory.centerX, y: this.memory.centerY },
    totalPlanned: this.memory.plannedStructures.length,
    byType: {},
  };

  for (const planned of this.memory.plannedStructures) {
    if (!stats.byType[planned.structureType]) {
      stats.byType[planned.structureType] = 0;
    }
    stats.byType[planned.structureType]++;
  }

  return stats;
};

module.exports = RoomPlanner;
