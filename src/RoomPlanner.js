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

const CONSTANTS = require("./constants");
const Log = require("Log");

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
  factory: [{ x: -1, y: 1, priority: 25 }],

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
    { x: 2, y: -1, priority: 14 },
    { x: -2, y: 1, priority: 15 },
    // Ring 2 (RCL 3-4)
    { x: 2, y: 1, priority: 16 },
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
    { x: -3, y: -3, priority: 65 },
    { x: 3, y: -3, priority: 66 },
    { x: -3, y: 3, priority: 67 },
    { x: 3, y: 3, priority: 68 },
    // Additional extensions for RCL 8
    { x: -5, y: 0, priority: 69 },
    { x: 5, y: 0, priority: 70 },
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
    { x: -1, y: 0, priority: 85 }, // At storage
    { x: 1, y: 0, priority: 86 }, // At spawn
    // Additional links are placed dynamically at Sources/Controller
  ],

  // Observer
  observer: [{ x: -3, y: -3, priority: 95 }],

  // Power Spawn
  powerSpawn: [{ x: -1, y: 2, priority: 96 }],

  // Nuker (far from center)
  nuker: [{ x: -4, y: 3, priority: 97 }],

  // Roads (main paths)
  roads: [
    // Cross through the center
    { x: 0, y: -1, priority: 200 },
    { x: -1, y: 0, priority: 201 },
    { x: 1, y: 0, priority: 202 },
    { x: 0, y: 2, priority: 203 },
    // Outer ring
    { x: -2, y: -2, priority: 204 },
    { x: -1, y: -2, priority: 205 },
    { x: 1, y: -2, priority: 206 },
    { x: 2, y: -2, priority: 207 },
    { x: -2, y: 2, priority: 208 },
    { x: 2, y: 2, priority: 209 },
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
    Log.info(`RoomPlanner: Center for ${this.roomName} found at (${this.memory.centerX}, ${this.memory.centerY})`, "RoomPlanner");
    return true;
  }

  // No spawn present - try to find optimal position
  const centerPos = this._calculateOptimalCenter();
  if (centerPos) {
    this.memory.centerX = centerPos.x;
    this.memory.centerY = centerPos.y;
    Log.info(`RoomPlanner: Optimal center for ${this.roomName} calculated at (${this.memory.centerX}, ${this.memory.centerY})`, "RoomPlanner");
    return true;
  }

  return false;
};

/**
 * Calculates the optimal center position
 */
RoomPlanner.prototype._calculateOptimalCenter = function () {
  const sources = this.room.find(FIND_SOURCES);
  const controller = this.room.controller;
  
  if (!controller) return null;

  let bestPos = null;
  let bestScore = Infinity;

  // Search through possible positions
  for (let x = 6; x < 44; x++) {
    for (let y = 6; y < 44; y++) {
      // Check if position and surroundings are free
      if (!this._isValidCenterPosition(x, y)) continue;

      // Calculate score (sum of distances to sources and controller)
      let score = 0;
      const pos = new RoomPosition(x, y, this.roomName);
      
      for (const source of sources) {
        score += pos.getRangeTo(source.pos);
      }
      score += pos.getRangeTo(controller.pos) * 0.5; // Controller weniger gewichten

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
  const range = 5; // Required free area around the center

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const checkX = x + dx;
      const checkY = y + dy;

      // Border check
      if (checkX < 2 || checkX > 47 || checkY < 2 || checkY > 47) {
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
  const centerX = this.memory.centerX;
  const centerY = this.memory.centerY;
  const terrain = this.room.getTerrain();
  const plannedStructures = [];

  // Helper function to add a structure
  const addStructure = (offsetX, offsetY, structureType, priority) => {
    const x = centerX + offsetX;
    const y = centerY + offsetY;

    // Border check
    if (x < 1 || x > 48 || y < 1 || y > 48) return;

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

  // Add spawns
  BUNKER_LAYOUT.spawns.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_SPAWN, pos.priority);
  });

  // Storage
  BUNKER_LAYOUT.storage.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_STORAGE, pos.priority);
  });

  // Terminal
  BUNKER_LAYOUT.terminal.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_TERMINAL, pos.priority);
  });

  // Factory
  BUNKER_LAYOUT.factory.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_FACTORY, pos.priority);
  });

  // Towers
  BUNKER_LAYOUT.towers.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_TOWER, pos.priority);
  });

  // Extensions
  BUNKER_LAYOUT.extensions.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_EXTENSION, pos.priority);
  });

  // Labs
  BUNKER_LAYOUT.labs.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_LAB, pos.priority);
  });

  // Links
  BUNKER_LAYOUT.links.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_LINK, pos.priority);
  });

  // Observer
  BUNKER_LAYOUT.observer.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_OBSERVER, pos.priority);
  });

  // Power Spawn
  BUNKER_LAYOUT.powerSpawn.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_POWER_SPAWN, pos.priority);
  });

  // Nuker
  BUNKER_LAYOUT.nuker.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_NUKER, pos.priority);
  });

  // Roads
  BUNKER_LAYOUT.roads.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_ROAD, pos.priority);
  });

  // Sort by priority
  plannedStructures.sort((a, b) => a.priority - b.priority);

  this.memory.plannedStructures = plannedStructures;
  this.memory.layoutGenerated = true;

  Log.success(`RoomPlanner: Layout for ${this.roomName} generated with ${plannedStructures.length} structures`, "RoomPlanner");
};

/**
 * Finds an alternative position when the desired one is blocked
 */
RoomPlanner.prototype._findAlternativePosition = function (x, y, structureType) {
  const terrain = this.room.getTerrain();
  const range = 2;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const newX = x + dx;
      const newY = y + dy;

      if (newX < 1 || newX > 48 || newY < 1 || newY > 48) continue;
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
  const maxSites = 5;
  if (existingSites.length >= maxSites) {
    return;
  }

  // Cache structure counts by type (CPU optimization - find only once)
  const structureCounts = this._getStructureCounts();

  let sitesPlaced = 0;

  for (const planned of this.memory.plannedStructures) {
    if (sitesPlaced >= maxSites - existingSites.length) break;

    const { x, y, structureType } = planned;

    // Check if structure can be built at current RCL
    if (!this._canBuildStructure(structureType, rcl, structureCounts)) {
      continue;
    }

    // Check if structure or construction site already exists
    const pos = new RoomPosition(x, y, this.roomName);
    const existingStructures = pos.lookFor(LOOK_STRUCTURES);
    const existingConstSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

    // Check if a structure of this type already exists
    const hasStructure = existingStructures.some(
      (s) => s.structureType === structureType || (s.structureType !== STRUCTURE_ROAD && structureType !== STRUCTURE_ROAD)
    );
    const hasSite = existingConstSites.some((s) => s.structureType === structureType);

    if (hasStructure || hasSite) {
      continue;
    }

    // Roads can be built over other structures, others cannot
    if (structureType !== STRUCTURE_ROAD) {
      const blockingStructure = existingStructures.find(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART
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
      Log.warn(`RoomPlanner: Could not place ${structureType} at (${x}, ${y}). Error: ${result}`, "RoomPlanner");
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
  // Roads are only built from RCL 5 onwards
  if (structureType === STRUCTURE_ROAD && rcl < 5) {
    return false;
  }

  // Number of allowed structures at this RCL
  const maxAllowed = CONTROLLER_STRUCTURES[structureType] ? CONTROLLER_STRUCTURES[structureType][rcl] : 0;
  
  if (maxAllowed === 0) {
    return false;
  }

  // Use cached counts if provided, otherwise calculate (for external calls)
  const totalCount = structureCounts 
    ? (structureCounts[structureType] || 0)
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

  // Container at sources (from RCL 1)
  this._placeSourceContainers();

  // Container beim Controller (ab RCL 1)
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
  const existingSite = mineral.pos.lookFor(LOOK_CONSTRUCTION_SITES).find((s) => s.structureType === STRUCTURE_EXTRACTOR);

  if (!existingExtractor && !existingSite) {
    const result = this.room.createConstructionSite(mineral.pos, STRUCTURE_EXTRACTOR);
    if (result === OK) {
      Log.debug(`RoomPlanner: Extractor construction site placed at mineral`, "RoomPlanner");
    }
  }

  // Container next to mineral
  this._placeContainerNear(mineral.pos, "mineral");
};

/**
 * Platziert Container bei Sources
 */
RoomPlanner.prototype._placeSourceContainers = function () {
  const sources = this.room.find(FIND_SOURCES);
  
  for (const source of sources) {
    this._placeContainerNear(source.pos, "source");
  }
};

/**
 * Platziert Container beim Controller
 */
RoomPlanner.prototype._placeControllerContainer = function () {
  if (!this.room.controller) return;
  this._placeContainerNear(this.room.controller.pos, "controller");
};

/**
 * Places a container near a position
 */
RoomPlanner.prototype._placeContainerNear = function (pos, type) {
  // Container erst ab konfiguriertem RCL bauen (Standard: RCL 3)
  if (this.room.controller.level < CONSTANTS.CONTAINER.MIN_RCL) {
    return;
  }
  
  const range = type === "controller" ? 2 : 1;
  
  // Check if container already in range
  const nearbyContainers = pos.findInRange(FIND_STRUCTURES, range, {
    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
  });
  
  const nearbySites = pos.findInRange(FIND_CONSTRUCTION_SITES, range, {
    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
  });

  if (nearbyContainers.length > 0 || nearbySites.length > 0) {
    return;
  }

  // Check if container limit reached
  if (!this._canBuildStructure(STRUCTURE_CONTAINER, this.room.controller.level)) {
    return;
  }

  // Find best position for container
  const terrain = this.room.getTerrain();
  let bestPos = null;
  let bestScore = Infinity;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;

      const x = pos.x + dx;
      const y = pos.y + dy;

      if (x < 1 || x > 48 || y < 1 || y > 48) continue;
      if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

      const checkPos = new RoomPosition(x, y, this.roomName);
      
      // Check if position is free
      const structures = checkPos.lookFor(LOOK_STRUCTURES);
      const sites = checkPos.lookFor(LOOK_CONSTRUCTION_SITES);
      
      if (structures.length > 0 || sites.length > 0) continue;

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
    const result = this.room.createConstructionSite(bestPos, STRUCTURE_CONTAINER);
    if (result === OK) {
      Log.debug(`RoomPlanner: Container construction site placed at ${type}`, "RoomPlanner");
    }
  }
};

/**
 * Platziert Links bei Sources
 */
RoomPlanner.prototype._placeSourceLinks = function () {
  const sources = this.room.find(FIND_SOURCES);
  
  for (const source of sources) {
    this._placeLinkNear(source.pos, "source");
  }
};

/**
 * Platziert Link beim Controller
 */
RoomPlanner.prototype._placeControllerLink = function () {
  if (!this.room.controller) return;
  this._placeLinkNear(this.room.controller.pos, "controller");
};

/**
 * Places a link near a position
 */
RoomPlanner.prototype._placeLinkNear = function (pos, type) {
  const range = 2;
  
  // Check if link already in range
  const nearbyLinks = pos.findInRange(FIND_STRUCTURES, range, {
    filter: (s) => s.structureType === STRUCTURE_LINK,
  });
  
  const nearbySites = pos.findInRange(FIND_CONSTRUCTION_SITES, range, {
    filter: (s) => s.structureType === STRUCTURE_LINK,
  });

  if (nearbyLinks.length > 0 || nearbySites.length > 0) {
    return;
  }

  // Check if link limit reached
  if (!this._canBuildStructure(STRUCTURE_LINK, this.room.controller.level)) {
    return;
  }

  // Find best position for link
  const terrain = this.room.getTerrain();
  let bestPos = null;
  let bestScore = Infinity;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;

      const x = pos.x + dx;
      const y = pos.y + dy;

      if (x < 1 || x > 48 || y < 1 || y > 48) continue;
      if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

      const checkPos = new RoomPosition(x, y, this.roomName);
      
      // Check if position is free
      const structures = checkPos.lookFor(LOOK_STRUCTURES);
      const sites = checkPos.lookFor(LOOK_CONSTRUCTION_SITES);
      
      const hasBlockingStructure = structures.some(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART
      );
      const hasBlockingSite = sites.some(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART
      );
      
      if (hasBlockingStructure || hasBlockingSite) continue;

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
    const result = this.room.createConstructionSite(bestPos, STRUCTURE_LINK);
    if (result === OK) {
      Log.debug(`RoomPlanner: Link construction site placed at ${type}`, "RoomPlanner");
    }
  }
};

/**
 * Visualizes the planned layout (for debugging)
 */
RoomPlanner.prototype.visualize = function () {
  if (!this.memory.layoutGenerated) return;

  const visual = this.room.visual;

  // Draw center
  if (this._hasCenter()) {
    visual.circle(this.memory.centerX, this.memory.centerY, {
      fill: "transparent",
      stroke: "#00ff00",
      strokeWidth: 0.2,
      radius: 0.5,
    });
  }

  // Draw planned structures
  const structureColors = {
    [STRUCTURE_SPAWN]: "#ffff00",
    [STRUCTURE_EXTENSION]: "#ffaa00",
    [STRUCTURE_TOWER]: "#ff0000",
    [STRUCTURE_STORAGE]: "#00ffff",
    [STRUCTURE_TERMINAL]: "#ff00ff",
    [STRUCTURE_LAB]: "#00ff00",
    [STRUCTURE_LINK]: "#0088ff",
    [STRUCTURE_FACTORY]: "#888888",
    [STRUCTURE_OBSERVER]: "#ffffff",
    [STRUCTURE_POWER_SPAWN]: "#ff8800",
    [STRUCTURE_NUKER]: "#880000",
    [STRUCTURE_ROAD]: "#aaaaaa",
  };

  for (const planned of this.memory.plannedStructures) {
    const color = structureColors[planned.structureType] || "#ffffff";
    visual.rect(planned.x - 0.4, planned.y - 0.4, 0.8, 0.8, {
      fill: color,
      opacity: 0.3,
      stroke: color,
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

