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

const BUNKER_LAYOUT = {
  // Spawn in center (used as reference point)
  spawns: [
    { x: 0, y: 0, priority: 1 },
  ],

  // Storage central for short paths
  storage: [{ x: -1, y: 1, priority: 10 }],

  // Terminal at old spawn position
  terminal: [{ x: -2, y: 0, priority: 20 }],

  // Factory
  factory: [{ x: -2, y: -1, priority: 25 }],

  // Towers in strategic positions (protection of the core)
  towers: [
    { x: 0, y: -2, priority: 5 },
    { x: 1, y: -1, priority: 6 },
  ],

  // Links in strategic positions
  links: [
    { x: -1, y: -1, priority: 86 },
    // Additional links are placed dynamically at Sources/Controller
  ],

  // Power Spawn
  powerSpawn: [{ x: -1, y: -2, priority: 96 }],

  // Nuker (far from center)
  nuker: [{ x: 1, y: 0, priority: 97 }],

  // 1 Lab in core (rest will be placed dynamically)
  labs: [
    { x: 0, y: 1, priority: 75 },
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
  this._structureCounts = null; // Cache for structure counts
}

/**
 * Helper: Checks if coordinates are within room boundaries
 */
RoomPlanner.prototype._isWithinBounds = function (x, y) {
  return (
    x >= CONSTANTS.PLANNER.ROOM_MIN &&
    x <= CONSTANTS.PLANNER.ROOM_MAX &&
    y >= CONSTANTS.PLANNER.ROOM_MIN &&
    y <= CONSTANTS.PLANNER.ROOM_MAX
  );
};

/**
 * Helper: Checks if position is valid (not a wall and within bounds)
 */
RoomPlanner.prototype._isValidPosition = function (x, y) {
  if (!this._isWithinBounds(x, y)) {
    return false;
  }
  const terrain = this.room.getTerrain();
  return terrain.get(x, y) !== TERRAIN_MASK_WALL;
};

/**
 * Helper: Checks if position is free (no structures or construction sites)
 */
RoomPlanner.prototype._isPositionFree = function (x, y, allowRoads = false) {
  const structures = this.room.lookForAt(LOOK_STRUCTURES, x, y);
  const sites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);

  if (allowRoads) {
    // Allow roads/ramparts, but block other structures
    const hasBlockingStructure = structures.some(
      (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART,
    );
    const hasBlockingSite = sites.some(
      (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART,
    );
    return !hasBlockingStructure && !hasBlockingSite;
  } else {
    // No structures or sites allowed
    return structures.length === 0 && sites.length === 0;
  }
};

/**
 * Helper: Checks if structure of given type exists at position
 */
RoomPlanner.prototype._hasStructureAt = function (x, y, structureType) {
  const structures = this.room.lookForAt(LOOK_STRUCTURES, x, y);
  const sites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
  return (
    structures.some((s) => s.structureType === structureType) ||
    sites.some((s) => s.structureType === structureType)
  );
};

/**
 * Helper: Checks if position is too close to sources (Range=2)
 */
RoomPlanner.prototype._isTooCloseToSource = function (x, y) {
  const sources = this.room.find(FIND_SOURCES);
  const pos = new RoomPosition(x, y, this.roomName);
  
  for (const source of sources) {
    if (pos.getRangeTo(source.pos) <= 2) {
      return true;
    }
  }
  
  return false;
};

/**
 * Helper: Checks if position is too close to controller (Range=3)
 */
RoomPlanner.prototype._isTooCloseToController = function (x, y) {
  if (!this.room.controller) {
    return false;
  }
  
  const pos = new RoomPosition(x, y, this.roomName);
  return pos.getRangeTo(this.room.controller.pos) <= 3;
};

/**
 * Helper: Validates position for structure placement (BUNKER_LAYOUT, Extensions, Labs)
 * Checks: boundaries, walls, sources (Range=2), controller (Range=3)
 */
RoomPlanner.prototype._isValidStructurePosition = function (x, y) {
  // 1. Check boundaries and walls
  if (!this._isValidPosition(x, y)) {
    return false;
  }
  
  // 2. Check if too close to sources (Range=2)
  if (this._isTooCloseToSource(x, y)) {
    return false;
  }
  
  // 3. Check if too close to controller (Range=3)
  if (this._isTooCloseToController(x, y)) {
    return false;
  }
  
  return true;
};

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
      layoutGenerated: undefined,  // undefined = noch nicht geprüft, true = erfolgreich, false = fehlgeschlagen
      plannedStructures: {
        list: [],  // Other structures (non-extensions)
        extensions: [],  // Extensions stored separately for better organization
      },
      visualizeUntil: null,
    };
  }
  
  // Ensure plannedStructures is an object with list and extensions
  if (!Memory.rooms[this.roomName].planner.plannedStructures || typeof Memory.rooms[this.roomName].planner.plannedStructures !== 'object' || Array.isArray(Memory.rooms[this.roomName].planner.plannedStructures)) {
    Memory.rooms[this.roomName].planner.plannedStructures = {
      list: Array.isArray(Memory.rooms[this.roomName].planner.plannedStructures) 
        ? Memory.rooms[this.roomName].planner.plannedStructures.filter((s) => s.structureType !== STRUCTURE_EXTENSION)
        : [],
      extensions: [],
    };
  }
  
  // Ensure extensions array exists
  if (!Memory.rooms[this.roomName].planner.plannedStructures.extensions) {
    Memory.rooms[this.roomName].planner.plannedStructures.extensions = [];
  }
  
  // Ensure list array exists
  if (!Memory.rooms[this.roomName].planner.plannedStructures.list) {
    Memory.rooms[this.roomName].planner.plannedStructures.list = [];
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
    const centerFound = this._findCenter();
    if (!centerFound) {
      // Center konnte nicht gefunden werden - Layout kann nicht generiert werden
      this.memory.layoutGenerated = false;
      return;
    }
  }

  // Generate layout if not already done
  if (this.memory.layoutGenerated !== true && this._hasCenter()) {
    try {
      this._generateLayout();
      // _generateLayout() setzt layoutGenerated auf true
    } catch (error) {
      // Layout-Generierung fehlgeschlagen
      this.memory.layoutGenerated = false;
      Log.error(`RoomPlanner: Layout generation failed for ${this.roomName}: ${error}`, "RoomPlanner");
    }
  }

  // Construction Sites platzieren
  if (this.memory.layoutGenerated === true) {
    this._placeConstructionSites(rcl);
  }

  // Place special structures (Extractor, Container at Sources)
  if (this.memory.layoutGenerated === true) {
    this._placeSpecialStructures(rcl);
  }

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
 * Versucht ein Layout für einen Raum zu generieren (auch ohne Claim)
 * Wird vom Scout aufgerufen, um zu prüfen ob ein Layout generiert werden kann
 * @returns {boolean} True wenn Layout erfolgreich generiert wurde, false wenn fehlgeschlagen
 */
RoomPlanner.prototype.tryGenerateLayout = function () {
  // Prüfe ob bereits ein Layout generiert wurde
  if (this.memory.layoutGenerated === true) {
    return true;
  }

  // Prüfe ob bereits bekannt ist, dass Layout-Generierung fehlschlägt
  if (this.memory.layoutGenerated === false) {
    return false;
  }

  // Prüfe ob Raum einen Controller hat (auch wenn nicht geclaimt)
  if (!this.room.controller) {
    this.memory.layoutGenerated = false;
    return false;
  }

  // Versuche Center zu finden
  if (!this._hasCenter()) {
    const centerFound = this._findCenter();
    if (!centerFound) {
      // Center konnte nicht gefunden werden
      this.memory.layoutGenerated = false;
      return false;
    }
  }

  // Versuche Layout zu generieren
  try {
    this._generateLayout();
    // _generateLayout() setzt layoutGenerated auf true
    return true;
  } catch (error) {
    // Layout-Generierung fehlgeschlagen
    this.memory.layoutGenerated = false;
    Log.error(`RoomPlanner: Layout generation failed for ${this.roomName}: ${error}`, "RoomPlanner");
    return false;
  }
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
  
  // Berechne den benötigten Bereich aus BUNKER_LAYOUT
  let minOffsetX = 0;
  let maxOffsetX = 0;
  let minOffsetY = 0;
  let maxOffsetY = 0;
  
  // Durchlaufe alle Strukturen im BUNKER_LAYOUT
  for (const key in BUNKER_LAYOUT) {
    if (!BUNKER_LAYOUT[key] || !Array.isArray(BUNKER_LAYOUT[key])) continue;
    
    for (const pos of BUNKER_LAYOUT[key]) {
      if (pos.x < minOffsetX) minOffsetX = pos.x;
      if (pos.x > maxOffsetX) maxOffsetX = pos.x;
      if (pos.y < minOffsetY) minOffsetY = pos.y;
      if (pos.y > maxOffsetY) maxOffsetY = pos.y;
    }
  }
  
  // Prüfe alle Positionen im benötigten Bereich
  for (let offsetX = minOffsetX; offsetX <= maxOffsetX; offsetX++) {
    for (let offsetY = minOffsetY; offsetY <= maxOffsetY; offsetY++) {
      const checkX = x + offsetX;
      const checkY = y + offsetY;

      // Border check - prüfe ob Position innerhalb der Raumgrenzen liegt
      if (
        checkX < CONSTANTS.PLANNER.ROOM_MIN ||
        checkX > CONSTANTS.PLANNER.ROOM_MAX ||
        checkY < CONSTANTS.PLANNER.ROOM_MIN ||
        checkY > CONSTANTS.PLANNER.ROOM_MAX
      ) {
        return false;
      }

      // Wall check - prüfe ob Position eine Wand ist
      if (terrain.get(checkX, checkY) === TERRAIN_MASK_WALL) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Places extensions dynamically using a spiral algorithm
 * Extensions are placed at positions where the sum of x and y is even
 * starting from the center and expanding outward in order of distance
 * Extensions are stored in memory.plannedStructures.extensions, not in plannedStructures.list
 */
RoomPlanner.prototype._placeExtensionsDynamically = function (plannedStructures, centerX, centerY, addStructure) {
  const usedPositions = new Set();
  
  // Mark all already planned positions as used
  for (const planned of plannedStructures) {
    usedPositions.add(`${planned.x},${planned.y}`);
  }
  
  // Also mark extension positions as used
  if (this.memory.plannedStructures.extensions) {
    for (const ext of this.memory.plannedStructures.extensions) {
      usedPositions.add(`${ext.x},${ext.y}`);
    }
  }

  // Clear existing extensions - will be recalculated
  this.memory.plannedStructures.extensions = [];

  // Priority starts at 11 (RCL 2) and increases
  let priority = 11;

  // Maximum range to search (room is 50x50, so max distance from center is about 25)
  const maxRange = 25;
  
  // Minimum range to avoid placing extensions too close to the core
  // Range 0-3 are reserved for core structures (spawn, storage, terminal, etc.)
  const minRange = 4;
  
  // Collect all candidate positions with even coordinates, sorted by distance from center
  const candidates = [];
  
  for (let range = minRange; range <= maxRange; range++) {
    // Search in a square pattern for this range
    // Only consider positions with even coordinates (divisible by 2)
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        // Only consider positions at the edge of the current range (to maintain spiral order)
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (dist !== range) {
          continue;
        }
        
        // Check if coordinates meet the extension placement rule
        // Extensions can only be built at positions where the sum of the offset (dx + dy) is even
        // This rule is relative to the center, not absolute
        // Examples: offset (0,0), (1,1), (2,0), (0,2), (2,2), (-1,1), etc.
        if ((dx + dy) % 2 !== 0) {
          continue;
        }
        
        const x = centerX + dx;
        const y = centerY + dy;
        
        // Calculate distance from center for sorting (Euclidean distance)
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        candidates.push({
          offsetX: dx,
          offsetY: dy,
          absX: x,
          absY: y,
          distance: distance,
        });
      }
    }
  }
  
  // Sort by distance (closer positions first), then by x, then by y for deterministic ordering
  candidates.sort((a, b) => {
    if (Math.abs(a.distance - b.distance) < 0.001) {
      // If distances are very close, sort by x, then y
      if (a.absX !== b.absX) {
        return a.absX - b.absX;
      }
      return a.absY - b.absY;
    }
    return a.distance - b.distance;
  });
  
  // Try to place extensions at candidate positions
  for (const candidate of candidates) {
    const { offsetX, offsetY, absX, absY } = candidate;
    
    // Check if position is already used
    const posKey = `${absX},${absY}`;
    if (usedPositions.has(posKey)) {
      continue;
    }
    
    // Validate position (boundaries, walls, sources, controller)
    if (!this._isValidStructurePosition(absX, absY)) {
      continue;
    }
    
    // Check if position is free OR if an extension already exists at this position
    // If an extension already exists, we should still include it in the plan
    const hasExistingExtension = this._hasStructureAt(absX, absY, STRUCTURE_EXTENSION);
    if (!hasExistingExtension && !this._isPositionFree(absX, absY)) {
      // Position is blocked by something other than an extension
      continue;
    }
    
    // Position is valid and either free or has an existing extension
    // Store extension in memory.plannedStructures.extensions
    this.memory.plannedStructures.extensions.push({
      x: absX,
      y: absY,
      structureType: STRUCTURE_EXTENSION,
      priority: priority,
    });
    usedPositions.add(posKey);
    priority++;
    
    // Stop if we've placed enough extensions (max 60 at RCL 8)
    // We continue searching to find all valid positions, but the actual
    // placement limit is enforced by RCL in _placeConstructionSites
    if (priority > 11 + 60) {
      break;
    }
  }
};

/**
 * Places remaining labs dynamically in groups of 3 (9 labs total, 1 already in core)
 * Uses extension positions as candidates for lab placement
 * Each group of 3 labs: middle lab at extension position, outer labs within range 2 of middle
 */
RoomPlanner.prototype._placeLabsDynamically = function (plannedStructures, centerX, centerY, addStructure) {
  const usedPositions = new Set();
  
  // Mark all already planned positions as used
  for (const planned of plannedStructures) {
    usedPositions.add(`${planned.x},${planned.y}`);
  }
  
  // Mark extension positions as used (we'll use them as candidates for labs)
  if (this.memory.plannedStructures.extensions) {
    for (const ext of this.memory.plannedStructures.extensions) {
      usedPositions.add(`${ext.x},${ext.y}`);
    }
  }

  // We need 9 more labs (1 already in core) = 3 groups of 3 labs
  const labsNeeded = 9;
  let labsPlaced = 0;
  let priority = 76; // Start after core lab (priority 75)

  // Get extension positions as candidates for lab placement
  const extensionCandidates = [];
  if (this.memory.plannedStructures.extensions) {
    for (const ext of this.memory.plannedStructures.extensions) {
      extensionCandidates.push({
        x: ext.x,
        y: ext.y,
        distance: Math.sqrt(
          Math.pow(ext.x - centerX, 2) + Math.pow(ext.y - centerY, 2)
        ),
      });
    }
  }
  
  // Sort extension candidates by distance from center (closer first)
  extensionCandidates.sort((a, b) => a.distance - b.distance);

  // Helper function to check if a position is available for a lab
  const isPositionAvailable = (x, y) => {
    // Validate position (boundaries, walls, sources, controller)
    if (!this._isValidStructurePosition(x, y)) {
      return false;
    }

    // Check if position is already used
    const posKey = `${x},${y}`;
    if (usedPositions.has(posKey)) {
      return false;
    }

    // Check if position is free (allow existing labs)
    const hasExistingLab = this._hasStructureAt(x, y, STRUCTURE_LAB);
    if (!hasExistingLab && !this._isPositionFree(x, y)) {
      return false;
    }

    return true;
  };

  // Try to place labs in groups of 3
  for (const candidate of extensionCandidates) {
    if (labsPlaced >= labsNeeded) break;

    const middleX = candidate.x;
    const middleY = candidate.y;

    // Check if middle position is available
    if (!isPositionAvailable(middleX, middleY)) {
      continue;
    }

    // Try to find 2 positions within range 2 of the middle lab
    const labGroup = [{ x: middleX, y: middleY }];
    const maxRange = 2; // Outer labs must be within range 2 of middle lab

    // Search for 2 more positions near the middle lab
    for (let dx = -maxRange; dx <= maxRange && labGroup.length < 3; dx++) {
      for (let dy = -maxRange; dy <= maxRange && labGroup.length < 3; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip middle position

        const x = middleX + dx;
        const y = middleY + dy;

        // Check if within range 2 (Chebyshev distance)
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (dist > maxRange) {
          continue;
        }

        // Check if position is available
        if (isPositionAvailable(x, y)) {
          // Check if this position is also an extension position (preferred)
          // or at least follows the extension rule (dx + dy even relative to center)
          const offsetX = x - centerX;
          const offsetY = y - centerY;
          if ((offsetX + offsetY) % 2 === 0) {
            labGroup.push({ x, y });
          }
        }
      }
    }

    // If we found 3 positions, place the lab group
    if (labGroup.length >= 3) {
      const labsToPlace = Math.min(3, labsNeeded - labsPlaced);
      for (let i = 0; i < labsToPlace; i++) {
        const pos = labGroup[i];
        addStructure(pos.x - centerX, pos.y - centerY, STRUCTURE_LAB, priority);
        usedPositions.add(`${pos.x},${pos.y}`);
        priority++;
        labsPlaced++;
      }
    }
  }

  // If we still need more labs, try placing them individually near extension positions
  if (labsPlaced < labsNeeded) {
    for (const candidate of extensionCandidates) {
      if (labsPlaced >= labsNeeded) break;

      const x = candidate.x;
      const y = candidate.y;

      if (isPositionAvailable(x, y)) {
        addStructure(x - centerX, y - centerY, STRUCTURE_LAB, priority);
        usedPositions.add(`${x},${y}`);
        priority++;
        labsPlaced++;
      }
    }
  }
};

/**
 * Detects existing containers and links for sources and controller
 * and stores their positions in memory for use in the layout
 */
RoomPlanner.prototype._detectExistingSpecialStructures = function () {
  // Detect containers and links at sources
  const sources = this.room.find(FIND_SOURCES);
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const containerIdentifier = `source_${i}`;
    const linkIdentifier = `source_link_${i}`;

    // Check for existing container near source
    const containerRange = CONSTANTS.PLANNER.CONTAINER_DEFAULT_RANGE;
    const nearbyContainers = source.pos.findInRange(FIND_STRUCTURES, containerRange, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER,
    });
    const nearbyContainerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, containerRange, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER,
    });

    if (nearbyContainers.length > 0) {
      const containerPos = nearbyContainers[0].pos;
      this._storeSpecialStructure(containerIdentifier, containerPos.x, containerPos.y, STRUCTURE_CONTAINER, source.id);
    } else if (nearbyContainerSites.length > 0) {
      const containerPos = nearbyContainerSites[0].pos;
      this._storeSpecialStructure(containerIdentifier, containerPos.x, containerPos.y, STRUCTURE_CONTAINER, source.id);
    }

    // Check for existing link near source
    const linkRange = CONSTANTS.PLANNER.LINK_PLACEMENT_RANGE;
    const nearbyLinks = source.pos.findInRange(FIND_STRUCTURES, linkRange, {
      filter: (s) => s.structureType === STRUCTURE_LINK,
    });
    const nearbyLinkSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, linkRange, {
      filter: (s) => s.structureType === STRUCTURE_LINK,
    });

    if (nearbyLinks.length > 0) {
      const linkPos = nearbyLinks[0].pos;
      this._storeSpecialStructure(linkIdentifier, linkPos.x, linkPos.y, STRUCTURE_LINK, source.id);
    } else if (nearbyLinkSites.length > 0) {
      const linkPos = nearbyLinkSites[0].pos;
      this._storeSpecialStructure(linkIdentifier, linkPos.x, linkPos.y, STRUCTURE_LINK, source.id);
    }
  }

  // Detect container and link at controller
  if (this.room.controller) {
    const controller = this.room.controller;
    const containerIdentifier = "controller";
    const linkIdentifier = "controller_link";

    // Check for existing container near controller
    const containerRange = CONSTANTS.PLANNER.CONTAINER_CONTROLLER_RANGE;
    const nearbyContainers = controller.pos.findInRange(FIND_STRUCTURES, containerRange, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER,
    });
    const nearbyContainerSites = controller.pos.findInRange(FIND_CONSTRUCTION_SITES, containerRange, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER,
    });

    if (nearbyContainers.length > 0) {
      const containerPos = nearbyContainers[0].pos;
      this._storeSpecialStructure(containerIdentifier, containerPos.x, containerPos.y, STRUCTURE_CONTAINER, controller.id);
    } else if (nearbyContainerSites.length > 0) {
      const containerPos = nearbyContainerSites[0].pos;
      this._storeSpecialStructure(containerIdentifier, containerPos.x, containerPos.y, STRUCTURE_CONTAINER, controller.id);
    }

    // Check for existing link near controller
    const linkRange = CONSTANTS.PLANNER.LINK_PLACEMENT_RANGE;
    const nearbyLinks = controller.pos.findInRange(FIND_STRUCTURES, linkRange, {
      filter: (s) => s.structureType === STRUCTURE_LINK,
    });
    const nearbyLinkSites = controller.pos.findInRange(FIND_CONSTRUCTION_SITES, linkRange, {
      filter: (s) => s.structureType === STRUCTURE_LINK,
    });

    if (nearbyLinks.length > 0) {
      const linkPos = nearbyLinks[0].pos;
      this._storeSpecialStructure(linkIdentifier, linkPos.x, linkPos.y, STRUCTURE_LINK, controller.id);
    } else if (nearbyLinkSites.length > 0) {
      const linkPos = nearbyLinkSites[0].pos;
      this._storeSpecialStructure(linkIdentifier, linkPos.x, linkPos.y, STRUCTURE_LINK, controller.id);
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

  // Detect existing containers and links for sources and controller
  // This ensures their positions are preserved in the new layout
  this._detectExistingSpecialStructures();

  // Helper function to add a structure
  const addStructure = (offsetX, offsetY, structureType, priority) => {
    const x = centerX + offsetX;
    const y = centerY + offsetY;

    // Validate position (boundaries, walls, sources, controller)
    if (!this._isValidStructurePosition(x, y)) {
      // Try to find alternative position
      const altPos = this._findAlternativePosition(x, y, structureType);
      if (altPos && this._isValidStructurePosition(altPos.x, altPos.y)) {
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
  // Extensions are stored in memory.plannedStructures.extensions, not in plannedStructures.list
  this._placeExtensionsDynamically(plannedStructures, centerX, centerY, addStructure);

  // Place remaining labs dynamically in 3x3 blocks (9 labs total, 1 already in core)
  this._placeLabsDynamically(plannedStructures, centerX, centerY, addStructure);

  // Sort by priority
  plannedStructures.sort((a, b) => a.priority - b.priority);
  
  // Sort extensions by priority
  if (this.memory.plannedStructures.extensions) {
    this.memory.plannedStructures.extensions.sort((a, b) => a.priority - b.priority);
  }

  this.memory.plannedStructures.list = plannedStructures;
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

      if (!this._isValidPosition(newX, newY)) {
        continue;
      }

      // Check if position is free
      if (this._isPositionFree(newX, newY)) {
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

  // Process extensions from memory.plannedStructures.extensions first
  if (this.memory.plannedStructures.extensions) {
    for (const ext of this.memory.plannedStructures.extensions) {
      if (sitesPlaced >= CONSTANTS.PLANNER.MAX_CONSTRUCTION_SITES - existingSites.length) break;

      const { x, y, structureType } = ext;

      // Check if structure can be built at current RCL
      if (!this._canBuildStructure(structureType, rcl, structureCounts)) {
        continue;
      }

      // Check if structure or construction site already exists
      const pos = new RoomPosition(x, y, this.roomName);
      const existingStructures = pos.lookFor(LOOK_STRUCTURES);
      const existingConstSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

      // Check if structure of this type already exists
      if (this._hasStructureAt(x, y, structureType)) {
        continue;
      }

      // Check if there's a blocking non-road, non-rampart structure
      const blockingStructure = existingStructures.find(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART,
      );
      if (blockingStructure) {
        continue;
      }

      // Try to place construction site
      const result = this.room.createConstructionSite(x, y, structureType);

      if (result === OK) {
        sitesPlaced++;
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
  }

  // Process other structures from plannedStructures.list
  for (const planned of this.memory.plannedStructures.list) {
    if (sitesPlaced >= CONSTANTS.PLANNER.MAX_CONSTRUCTION_SITES - existingSites.length) break;

    const { x, y, structureType } = planned;

    // Skip special structures (Container/Links) - they are handled by _placeSpecialStructures
    if (planned.specialIdentifier) {
      continue;
    }

    // Temporarily skip labs - only planning, not construction
    if (structureType === STRUCTURE_LAB) {
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
      if (this._hasStructureAt(x, y, structureType)) {
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
 * Resets the structure counts cache (call when structures change)
 */
RoomPlanner.prototype._resetStructureCountsCache = function () {
  this._structureCounts = null;
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
    if (result !== OK && result !== ERR_RCL_NOT_ENOUGH) {
      Log.warn(
        `RoomPlanner: Could not place extractor at mineral. Error: ${global.getErrorString(result)}`,
        "RoomPlanner",
      );
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
          // Construction site placed successfully
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
  if (!this.room.controller || !this._canBuildStructure(structureType, this.room.controller.level)) {
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

      if (!this._isValidPosition(x, y)) {
        continue;
      }

      const checkPos = new RoomPosition(x, y, this.roomName);

      // Check if position is free
      if (!this._isPositionFree(x, y, allowRoads)) {
        continue;
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
  if (!this.memory.plannedStructures || typeof this.memory.plannedStructures !== 'object' || Array.isArray(this.memory.plannedStructures)) {
    this.memory.plannedStructures = {
      list: Array.isArray(this.memory.plannedStructures) ? this.memory.plannedStructures : [],
      extensions: [],
    };
  }
  if (!this.memory.plannedStructures.list) {
    this.memory.plannedStructures.list = [];
  }

  // Remove existing entry with same identifier
  this.memory.plannedStructures.list = this.memory.plannedStructures.list.filter(
    (s) => !(s.specialIdentifier && s.specialIdentifier === identifier),
  );

  /// Priority assignment:
  // - Containers: 1000+
  // - First source link (source_link_0): 85 (before spawn link at 86)
  // - Spawn link: 86 (from BUNKER_LAYOUT)
  // - Second source link (source_link_1): 87 (after spawn link)
  // - Other source links: 88+
  // - Controller link: after all source links
  let priority;
  if (structureType === STRUCTURE_CONTAINER) {
    priority = 1000;
  } else if (structureType === STRUCTURE_LINK) {
    if (identifier === "source_link_0") {
      priority = 85; // First source link - before spawn link
    } else if (identifier === "source_link_1") {
      priority = 87; // Second source link - after spawn link
    } else if (identifier.startsWith("source_link_")) {
      // Other source links (source_link_2, source_link_3, etc.) - after source_link_1
      const linkIndex = parseInt(identifier.split("_")[2]) || 0;
      priority = 88 + (linkIndex - 2); // 88, 89, etc. for source_link_2, source_link_3...
    } else if (identifier === "controller_link") {
      priority = 95; // Controller link - after all source links (increased from 90 to ensure it's last)
    } else {
      priority = 1100; // Fallback for other links
    }
  } else {
    priority = 1100; // Fallback
  }

  this.memory.plannedStructures.list.push({
    x: x,
    y: y,
    structureType: structureType,
    priority: priority,
    specialIdentifier: identifier,
    targetId: targetId,
  });
};

/**
 * Gets stored special structure position from memory
 */
RoomPlanner.prototype._getStoredSpecialStructure = function (identifier) {
  if (!this.memory.plannedStructures || !this.memory.plannedStructures.list) {
    return null;
  }

  const stored = this.memory.plannedStructures.list.find((s) => s.specialIdentifier && s.specialIdentifier === identifier);

  return stored ? { x: stored.x, y: stored.y, structureType: stored.structureType } : null;
};

/**
 * Removes stored special structure from memory
 */
RoomPlanner.prototype._removeStoredSpecialStructure = function (identifier) {
  if (!this.memory.plannedStructures || !this.memory.plannedStructures.list) {
    return;
  }

  this.memory.plannedStructures.list = this.memory.plannedStructures.list.filter(
    (s) => !(s.specialIdentifier && s.specialIdentifier === identifier),
  );
};

/**
 * Activates visualization for 15 ticks
 */
RoomPlanner.prototype.visualize = function () {
  if (this.memory.layoutGenerated !== true) {
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
  if (this.memory.layoutGenerated !== true || !this._hasCenter()) {
    return [];
  }

  const orphanedStructures = [];
  const {centerX, centerY} = this.memory;

  // Create a map of planned positions: "x,y" -> structureType
  const plannedPositions = new Map();
  const plannedExtensionPositions = new Set(); // Track extension positions separately
  
  // Add extensions from memory.plannedStructures.extensions
  if (this.memory.plannedStructures.extensions) {
    for (const ext of this.memory.plannedStructures.extensions) {
      const key = `${ext.x},${ext.y}`;
      plannedExtensionPositions.add(key);
    }
  }
  
  // Add other structures from plannedStructures.list
  for (const planned of this.memory.plannedStructures.list) {
    const key = `${planned.x},${planned.y}`;
    // Include all structures, even those with specialIdentifier (like links)
    // They are still planned structures and should not be marked as orphaned
    plannedPositions.set(key, planned.structureType);
  }

  // Find all structures in the room that could be planned by the planner
  // Exclude roads from orphaned structures check
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
    // STRUCTURE_ROAD - excluded from orphaned check
  ];

  const structures = this.room.find(FIND_STRUCTURES, {
    filter: (s) => plannerStructureTypes.includes(s.structureType),
  });

  for (const structure of structures) {
    const key = `${structure.pos.x},${structure.pos.y}`;
    
    // For extensions, check if position is in the extension positions set
    if (structure.structureType === STRUCTURE_EXTENSION) {
      if (!plannedExtensionPositions.has(key)) {
        // Extension exists but not planned at this position
        const distanceFromCenter = Math.max(
          Math.abs(structure.pos.x - centerX),
          Math.abs(structure.pos.y - centerY),
        );
        if (distanceFromCenter <= 20) {
          orphanedStructures.push({
            structure: structure,
            x: structure.pos.x,
            y: structure.pos.y,
            structureType: structure.structureType,
          });
        }
      }
    } else {
      // For other structures, check the map
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
  }

  return orphanedStructures;
};

/**
 * Draws the visualization (internal method)
 */
RoomPlanner.prototype._drawVisualization = function () {
  if (this.memory.layoutGenerated !== true) return;

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
  for (const planned of this.memory.plannedStructures.list) {
    usedStructures.add(planned.structureType);
  }
  // Also include extensions
  if (this.memory.plannedStructures.extensions && this.memory.plannedStructures.extensions.length > 0) {
    usedStructures.add(STRUCTURE_EXTENSION);
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
  for (const planned of this.memory.plannedStructures.list) {
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
  
  // Draw extensions from memory.plannedStructures.extensions
  if (this.memory.plannedStructures.extensions) {
    const extensionColor = structureColors[STRUCTURE_EXTENSION] || "#888888";
    for (const ext of this.memory.plannedStructures.extensions) {
      visual.rect(ext.x - 0.4, ext.y - 0.4, 0.8, 0.8, {
        fill: extensionColor,
        opacity: 0.8,
        stroke: extensionColor,
        strokeWidth: 0.1,
      });

      // Draw structure initial letter
      const letter = structureLetters[STRUCTURE_EXTENSION] || "E";
      visual.text(letter, ext.x, ext.y + 0.3, {
        color: "#000000",
        font: "0.6 Arial",
        align: "center",
        stroke: "#ffffff",
        strokeWidth: 0.1,
      });
    }
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
 * Recalculates extension placements
 * Removes all existing extension positions from the layout and recalculates them
 */
RoomPlanner.prototype.recalculateExtensions = function () {
  if (this.memory.layoutGenerated !== true || !this._hasCenter()) {
    Log.warn(`Cannot recalculate extensions: Layout not generated or center not found for ${this.roomName}`, "RoomPlanner");
    return false;
  }

  const centerX = this.memory.centerX;
  const centerY = this.memory.centerY;

  // Remove all existing extensions from memory.plannedStructures.extensions
  const removedCount = this.memory.plannedStructures.extensions ? this.memory.plannedStructures.extensions.length : 0;
  this.memory.plannedStructures.extensions = [];

  // Create a copy of current planned structures for _placeExtensionsDynamically
  const plannedStructures = [...this.memory.plannedStructures.list];

  // Helper function to add a structure (not used for extensions, but needed for signature)
  const addStructure = (offsetX, offsetY, structureType, priority) => {
    // Extensions are handled directly in _placeExtensionsDynamically
    // This function is not used for extensions anymore
  };

  // Recalculate extensions (will store in memory.plannedStructures.extensions)
  this._placeExtensionsDynamically(plannedStructures, centerX, centerY, addStructure);

  const newExtensionCount = this.memory.plannedStructures.extensions ? this.memory.plannedStructures.extensions.length : 0;
  Log.info(
    `RoomPlanner: Recalculated extensions for ${this.roomName}. Removed ${removedCount}, placed ${newExtensionCount} extensions`,
    "RoomPlanner",
  );

  return true;
};

/**
 * Recalculates lab placements
 * Removes all existing dynamically placed lab positions from the layout and recalculates them
 * Note: The core lab from BUNKER_LAYOUT is preserved
 */
RoomPlanner.prototype.recalculateLabs = function () {
  if (this.memory.layoutGenerated !== true || !this._hasCenter()) {
    Log.warn(`Cannot recalculate labs: Layout not generated or center not found for ${this.roomName}`, "RoomPlanner");
    return false;
  }

  const centerX = this.memory.centerX;
  const centerY = this.memory.centerY;

  // Remove all dynamically placed labs from plannedStructures.list
  // Keep the core lab from BUNKER_LAYOUT (priority 75)
  const beforeCount = this.memory.plannedStructures.list.length;
  this.memory.plannedStructures.list = this.memory.plannedStructures.list.filter(
    (s) => !(s.structureType === STRUCTURE_LAB && s.priority !== 75),
  );
  const removedCount = beforeCount - this.memory.plannedStructures.list.length;

  // Create a copy of current planned structures for _placeLabsDynamically
  const plannedStructures = [...this.memory.plannedStructures.list];

  // Helper function to add a structure (same as in _generateLayout)
  const addStructure = (offsetX, offsetY, structureType, priority) => {
    const x = centerX + offsetX;
    const y = centerY + offsetY;

    // Validate position (boundaries, walls, sources, controller)
    if (!this._isValidStructurePosition(x, y)) {
      return;
    }

    plannedStructures.push({ x, y, structureType, priority });
  };

  // Recalculate labs (will add to plannedStructures)
  this._placeLabsDynamically(plannedStructures, centerX, centerY, addStructure);

  // Sort by priority
  plannedStructures.sort((a, b) => a.priority - b.priority);

  // Update memory
  this.memory.plannedStructures.list = plannedStructures;

  const newLabCount = plannedStructures.filter((s) => s.structureType === STRUCTURE_LAB && s.priority !== 75).length;
  Log.info(
    `RoomPlanner: Recalculated labs for ${this.roomName}. Removed ${removedCount}, placed ${newLabCount} labs`,
    "RoomPlanner",
  );

  return true;
};

/**
 * Resets the layout (for replanning)
 */
RoomPlanner.prototype.reset = function () {
  this.memory.centerX = null;
  this.memory.centerY = null;
  this.memory.layoutGenerated = undefined;  // Reset auf undefined = noch nicht geprüft
  this.memory.plannedStructures = {
    list: [],
    extensions: [],
  };
  Log.info(`RoomPlanner: Layout for ${this.roomName} reset`, "RoomPlanner");
};

/**
 * Returns statistics about the planned layout
 */
RoomPlanner.prototype.getStats = function () {
  if (this.memory.layoutGenerated !== true) {
    if (this.memory.layoutGenerated === false) {
      return { status: "Layout-Generierung fehlgeschlagen" };
    }
    return { status: "nicht generiert" };
  }

  const extensionCount = this.memory.plannedStructures.extensions ? this.memory.plannedStructures.extensions.length : 0;
  const stats = {
    center: { x: this.memory.centerX, y: this.memory.centerY },
    totalPlanned: this.memory.plannedStructures.list.length + extensionCount,
    byType: {},
  };

  for (const planned of this.memory.plannedStructures.list) {
    if (!stats.byType[planned.structureType]) {
      stats.byType[planned.structureType] = 0;
    }
    stats.byType[planned.structureType]++;
  }
  
  // Add extensions count
  if (extensionCount > 0) {
    stats.byType[STRUCTURE_EXTENSION] = extensionCount;
  }

  return stats;
};

module.exports = RoomPlanner;
