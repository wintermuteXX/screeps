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
const duneConfig = require("./config.dune");

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
/**
 * Extension pattern template from JSON (relative to center)
 * Used as template for dynamic placement
 */
const EXTENSION_PATTERN = [
  { x: 2, y: 2 }, { x: 2, y: 4 }, { x: 1, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 2 },
  { x: -3, y: 3 }, { x: -2, y: 4 }, { x: -3, y: 1 }, { x: -2, y: 0 }, { x: -3, y: -1 },
  { x: -2, y: -2 }, { x: -3, y: -3 }, { x: -3, y: -5 }, { x: -2, y: -6 }, { x: -1, y: -5 },
  { x: 0, y: -4 }, { x: 0, y: -6 }, { x: 1, y: -5 }, { x: 2, y: -6 }, { x: 2, y: -4 },
  { x: 3, y: -5 }, { x: 4, y: -6 }, { x: 4, y: -4 }, { x: 5, y: -5 }, { x: 3, y: -3 },
  { x: 5, y: -3 }, { x: 6, y: -6 }, { x: 6, y: -4 }, { x: 4, y: -2 }, { x: 6, y: -2 },
  { x: 5, y: -1 }, { x: 4, y: 0 }, { x: 6, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 3 },
  { x: 4, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 2 }, { x: 1, y: -3 }, { x: -1, y: -1 },
  { x: 0, y: -2 }, { x: -1, y: 1 }, { x: 3, y: 1 },
];

const BUNKER_LAYOUT = {
  // Spawn in center (used as reference point)
  spawns: [
    { x: 0, y: 0, priority: 1 },
  ],

  // Storage central for short paths
  storage: [{ x: 1, y: 1, priority: 10 }],

  // Terminal next to Storage
  terminal: [{ x: 2, y: 0, priority: 20 }],

  // Factory
  factory: [{ x: 0, y: -1, priority: 25 }],

  // Towers in strategic positions (protection of the core)
  towers: [
    { x: 2, y: -2, priority: 5 },
    { x: 3, y: -1, priority: 6 },
  ],

  // Links in strategic positions
  links: [
    { x: 1, y: -1, priority: 86 }, // At spawn
    // Additional links are placed dynamically at Sources/Controller
  ],

  // Power Spawn
  powerSpawn: [{ x: 1, y: -2, priority: 96 }],

  // Nuker (far from center)
  nuker: [{ x: 3, y: 0, priority: 97 }],

  // 1 Lab in core (rest will be placed dynamically)
  labs: [
    { x: 2, y: 1, priority: 75 },
  ],

  // Extensions and remaining labs are placed dynamically
  // See _placeExtensionsDynamically() and _placeLabsDynamically()
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
 * Places extensions dynamically based on pattern template, only where space is available
 */
RoomPlanner.prototype._placeExtensionsDynamically = function (plannedStructures, centerX, centerY, addStructure) {
  const terrain = this.room.getTerrain();
  const usedPositions = new Set();
  
  // Mark all already planned positions as used
  for (const planned of plannedStructures) {
    usedPositions.add(`${planned.x},${planned.y}`);
  }

  // Priority starts at 11 (RCL 2) and increases
  let priority = 11;

  // Try to place extensions following the pattern
  for (const patternPos of EXTENSION_PATTERN) {
    const x = centerX + patternPos.x;
    const y = centerY + patternPos.y;

    // Border check
    if (
      x < CONSTANTS.PLANNER.ROOM_MIN ||
      x > CONSTANTS.PLANNER.ROOM_MAX ||
      y < CONSTANTS.PLANNER.ROOM_MIN ||
      y > CONSTANTS.PLANNER.ROOM_MAX
    ) {
      continue;
    }

    // Check if position is already used
    const posKey = `${x},${y}`;
    if (usedPositions.has(posKey)) {
      continue;
    }

    // Wall check
    if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
      // Try to find alternative position nearby
      const altPos = this._findAlternativePosition(x, y, STRUCTURE_EXTENSION);
      if (altPos && !usedPositions.has(`${altPos.x},${altPos.y}`)) {
        addStructure(altPos.x - centerX, altPos.y - centerY, STRUCTURE_EXTENSION, priority);
        usedPositions.add(`${altPos.x},${altPos.y}`);
        priority++;
      }
      continue;
    }

    // Check if position is free (no existing structures or construction sites)
    const structures = this.room.lookForAt(LOOK_STRUCTURES, x, y);
    const sites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
    
    if (structures.length === 0 && sites.length === 0) {
      // Position is free, place extension
      addStructure(patternPos.x, patternPos.y, STRUCTURE_EXTENSION, priority);
      usedPositions.add(posKey);
      priority++;
    }
  }
};

/**
 * Places remaining labs dynamically in 3er-blocks (9 labs total, 1 already in core)
 * Labs are placed in groups of 3, but not necessarily in perfect 3x3 squares
 */
RoomPlanner.prototype._placeLabsDynamically = function (plannedStructures, centerX, centerY, addStructure) {
  const terrain = this.room.getTerrain();
  const usedPositions = new Set();
  
  // Mark all already planned positions as used
  for (const planned of plannedStructures) {
    usedPositions.add(`${planned.x},${planned.y}`);
  }

  // We need 9 more labs (1 already in core)
  const labsNeeded = 9;
  let labsPlaced = 0;
  let priority = 76; // Start after core lab (priority 75)

  // Search for available positions outside the core
  const searchRange = 20;
  const coreExclusionRadius = 4;

  // Helper function to check if a position is available
  const isPositionAvailable = (x, y) => {
    // Border check
    if (
      x < CONSTANTS.PLANNER.ROOM_MIN ||
      x > CONSTANTS.PLANNER.ROOM_MAX ||
      y < CONSTANTS.PLANNER.ROOM_MIN ||
      y > CONSTANTS.PLANNER.ROOM_MAX
    ) {
      return false;
    }

    // Wall check
    if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
      return false;
    }

    // Check if position is already used
    const posKey = `${x},${y}`;
    if (usedPositions.has(posKey)) {
      return false;
    }

    // Check if position is free
    const structures = this.room.lookForAt(LOOK_STRUCTURES, x, y);
    const sites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
    
    return structures.length === 0 && sites.length === 0;
  };

  // Try to find 3 labs per block, placing them close together
  while (labsPlaced < labsNeeded) {
    let blockFound = false;

    // Search for a starting position for a new block
    for (let startX = -searchRange; startX <= searchRange && !blockFound && labsPlaced < labsNeeded; startX++) {
      for (let startY = -searchRange; startY <= searchRange && !blockFound && labsPlaced < labsNeeded; startY++) {
        const absStartX = centerX + startX;
        const absStartY = centerY + startY;

        // Skip if too close to center
        const distFromCenter = Math.max(Math.abs(startX), Math.abs(startY));
        if (distFromCenter < coreExclusionRadius) {
          continue;
        }

        // Check if starting position is available
        if (!isPositionAvailable(absStartX, absStartY)) {
          continue;
        }

        // Try to find 2 more positions nearby for a 3-lab block
        const blockPositions = [{ x: startX, y: startY, absX: absStartX, absY: absStartY }];
        const searchRadius = 3; // Search within 3 tiles for other labs in the block

        for (let dx = -searchRadius; dx <= searchRadius && blockPositions.length < 3; dx++) {
          for (let dy = -searchRadius; dy <= searchRadius && blockPositions.length < 3; dy++) {
            if (dx === 0 && dy === 0) continue; // Skip starting position

            const x = absStartX + dx;
            const y = absStartY + dy;

            if (isPositionAvailable(x, y)) {
              // Check if this position is not too close to center
              const relX = startX + dx;
              const relY = startY + dy;
              const dist = Math.max(Math.abs(relX), Math.abs(relY));
              if (dist >= coreExclusionRadius) {
                blockPositions.push({ x: relX, y: relY, absX: x, absY: y });
              }
            }
          }
        }

        // If we found at least 3 positions, place the labs
        if (blockPositions.length >= 3) {
          const labsToPlace = Math.min(3, labsNeeded - labsPlaced);
          for (let i = 0; i < labsToPlace; i++) {
            const pos = blockPositions[i];
            addStructure(pos.x, pos.y, STRUCTURE_LAB, priority);
            usedPositions.add(`${pos.absX},${pos.absY}`);
            priority++;
            labsPlaced++;
          }
          blockFound = true;
        }
      }
    }

    // If we couldn't find a block, try placing labs individually
    if (!blockFound && labsPlaced < labsNeeded) {
      for (let x = -searchRange; x <= searchRange && labsPlaced < labsNeeded; x++) {
        for (let y = -searchRange; y <= searchRange && labsPlaced < labsNeeded; y++) {
          const absX = centerX + x;
          const absY = centerY + y;

          const distFromCenter = Math.max(Math.abs(x), Math.abs(y));
          if (distFromCenter < coreExclusionRadius) {
            continue;
          }

          if (isPositionAvailable(absX, absY)) {
            addStructure(x, y, STRUCTURE_LAB, priority);
            usedPositions.add(`${absX},${absY}`);
            priority++;
            labsPlaced++;
          }
        }
      }
    }

    // If we still haven't placed all labs, break to avoid infinite loop
    if (!blockFound && labsPlaced < labsNeeded) {
      break;
    }
  }
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

  // Add all core structures from layout
  const structureKeys = [
    "spawns",
    "storage",
    "terminal",
    "factory",
    "towers",
    "links",
    "powerSpawn",
    "nuker",
    "labs", // 1 lab in core
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

  // Place extensions dynamically (only where space is available)
  this._placeExtensionsDynamically(plannedStructures, centerX, centerY, addStructure);

  // Place remaining labs dynamically in 3x3 blocks (9 labs total, 1 already in core)
  this._placeLabsDynamically(plannedStructures, centerX, centerY, addStructure);

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
    // For spawns, use a random planet name from Dune universe
    let result;
    let planetName = null;
    if (structureType === STRUCTURE_SPAWN) {
      planetName = duneConfig.getRandomPlanet();
      result = this.room.createConstructionSite(x, y, structureType, planetName);
    } else {
      result = this.room.createConstructionSite(x, y, structureType);
    }

    if (result === OK) {
      sitesPlaced++;
      if (structureType === STRUCTURE_SPAWN) {
        Log.debug(`RoomPlanner: Construction site for Spawn "${planetName}" placed at (${x}, ${y})`, "RoomPlanner");
      } else {
        Log.debug(`RoomPlanner: Construction site for ${structureType} placed at (${x}, ${y})`, "RoomPlanner");
      }
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
    
    // Versuche zuerst den Container für diese Source zu finden
    const containerIdentifier = `source_${i}`;
    const containerPosition = this._getStoredSpecialStructure(containerIdentifier);
    
    if (containerPosition) {
      // Container existiert - platziere Link direkt daneben (Range 1)
      const containerPos = new RoomPosition(containerPosition.x, containerPosition.y, this.roomName);
      this._placeLinkNearContainer(containerPos, "source", identifier, source.id);
    } else {
      // Container existiert noch nicht - platziere Link in der Nähe der Source (Fallback)
      this._placeLinkNear(source.pos, "source", identifier, source.id);
    }
  }
};

/**
 * Places a link directly adjacent to a container (Range 1)
 */
RoomPlanner.prototype._placeLinkNearContainer = function (containerPos, type, identifier, targetId) {
  const range = 1; // Direkt angrenzend
  this._placeStructureNear(containerPos, STRUCTURE_LINK, range, type, true, identifier, targetId);
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
 * Finds orphaned structures (built but no longer in the layout)
 * @returns {Array} Array of orphaned structures with their positions
 */
RoomPlanner.prototype._findOrphanedStructures = function () {
  if (!this.memory.layoutGenerated || !this._hasCenter()) {
    return [];
  }

  const orphanedStructures = [];
  const {centerX, centerY} = this.memory;

  // Create a map of planned positions: "x,y" -> structureType
  const plannedPositions = new Map();
  for (const planned of this.memory.plannedStructures) {
    // Skip special structures (containers/links at sources) - they're dynamic
    if (planned.specialIdentifier) continue;
    const key = `${planned.x},${planned.y}`;
    plannedPositions.set(key, planned.structureType);
  }

  // Find all structures in the room that could be planned by the planner
  const plannerStructureTypes = [
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_TOWER,
    STRUCTURE_STORAGE,
    STRUCTURE_TERMINAL,
    STRUCTURE_FACTORY,
    STRUCTURE_LAB,
    STRUCTURE_LINK,
    STRUCTURE_OBSERVER,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_NUKER,
    STRUCTURE_ROAD,
  ];

  const structures = this.room.find(FIND_STRUCTURES, {
    filter: (s) => plannerStructureTypes.includes(s.structureType),
  });

  for (const structure of structures) {
    const key = `${structure.pos.x},${structure.pos.y}`;
    const plannedType = plannedPositions.get(key);

    // Structure is orphaned if:
    // 1. No structure is planned at this position, OR
    // 2. A different structure type is planned at this position
    if (!plannedType || plannedType !== structure.structureType) {
      // Check if it's within reasonable range of the center (to avoid flagging structures far away)
      const distanceFromCenter = Math.max(
        Math.abs(structure.pos.x - centerX),
        Math.abs(structure.pos.y - centerY),
      );
      // Only flag structures within 20 tiles of center (reasonable bunker range)
      if (distanceFromCenter <= 20) {
        orphanedStructures.push({
          structure: structure,
          x: structure.pos.x,
          y: structure.pos.y,
          structureType: structure.structureType,
        });
      }
    }
  }

  return orphanedStructures;
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

  // Draw orphaned structures (structures that exist but are no longer in the layout)
  const orphanedStructures = this._findOrphanedStructures();
  if (orphanedStructures.length > 0) {
    // Draw orphaned structures with red X marker
    for (const orphaned of orphanedStructures) {
      // Draw red background
      visual.rect(orphaned.x - 0.4, orphaned.y - 0.4, 0.8, 0.8, {
        fill: "#ff0000",
        opacity: 0.6,
        stroke: "#ff0000",
        strokeWidth: 0.2,
      });

      // Draw X mark
      visual.line(orphaned.x - 0.3, orphaned.y - 0.3, orphaned.x + 0.3, orphaned.y + 0.3, {
        color: "#ffffff",
        width: 0.15,
        opacity: 1,
      });
      visual.line(orphaned.x - 0.3, orphaned.y + 0.3, orphaned.x + 0.3, orphaned.y - 0.3, {
        color: "#ffffff",
        width: 0.15,
        opacity: 1,
      });

      // Draw structure type letter
      const letter = structureLetters[orphaned.structureType] || "?";
      visual.text(letter, orphaned.x, orphaned.y + 0.3, {
        color: "#ffffff",
        font: "0.5 Arial",
        align: "center",
        stroke: "#000000",
        strokeWidth: 0.15,
      });
    }

    // Add orphaned structures info to legend
    const orphanedCount = orphanedStructures.length;
    const orphanedY = legendY;
    visual.rect(0.5, orphanedY, legendWidth, 1.5, {
      fill: "#ff0000",
      opacity: 0.7,
      stroke: "#ffffff",
      strokeWidth: 0.2,
    });
    visual.text(`⚠ ${orphanedCount} verwaiste Gebäude`, 1, orphanedY + 0.5, {
      color: "#ffffff",
      font: "0.7 Arial",
      align: "left",
      stroke: "#000000",
      strokeWidth: 0.1,
    });
    visual.text("(nicht mehr im Layout)", 1, orphanedY + 1, {
      color: "#ffffff",
      font: "0.5 Arial",
      align: "left",
      stroke: "#000000",
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
