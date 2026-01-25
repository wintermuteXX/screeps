const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

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
  spawns: [{ x: 0, y: 0, priority: 1 }],

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

  // 1 Lab in core for boosting (rest will be placed dynamically)
  labs: [{ x: 0, y: 1, priority: 75 }],

  // Extensions and remaining labs are placed dynamically
  // See _placeExtensionsDynamically()
};

module.exports = function applyPlannerLayout(RoomPlanner) {
  /**
   * Findet das Zentrum basierend auf dem ersten Spawn
   */
  RoomPlanner.prototype._findCenter = function () {
    const spawns = this.cache.get("mySpawns", () => {
      return this.room.find(FIND_MY_SPAWNS);
    });

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
    const sources = this.cache.get("sources", () => {
      return this.room.find(FIND_SOURCES);
    });
    const { controller } = this.room;

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

    // Calculate the required area from BUNKER_LAYOUT
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

    // Check all positions in the required area
    for (let offsetX = minOffsetX; offsetX <= maxOffsetX; offsetX++) {
      for (let offsetY = minOffsetY; offsetY <= maxOffsetY; offsetY++) {
        const checkX = x + offsetX;
        const checkY = y + offsetY;

        // Border check - verify position is within room bounds
        if (
          checkX < CONSTANTS.PLANNER.ROOM_MIN ||
          checkX > CONSTANTS.PLANNER.ROOM_MAX ||
          checkY < CONSTANTS.PLANNER.ROOM_MIN ||
          checkY > CONSTANTS.PLANNER.ROOM_MAX
        ) {
          return false;
        }

        // Wall check - verify position is a wall
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
  RoomPlanner.prototype._placeExtensionsDynamically = function (
    plannedStructures,
    centerX,
    centerY,
    addStructure,
  ) {
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
   * Generiert das Layout basierend auf dem Bunker-Design
   */
  RoomPlanner.prototype._generateLayout = function () {
    const { centerX } = this.memory;
    const { centerY } = this.memory;
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

      // Check that BUNKER_LAYOUT[key] exists before calling forEach
      if (!BUNKER_LAYOUT[key]) continue;

      BUNKER_LAYOUT[key].forEach((pos) => {
        addStructure(pos.x, pos.y, structureType, pos.priority);
      });
    }

    // Place extensions dynamically (only where space is available)
    // Extensions are stored in memory.plannedStructures.extensions, not in plannedStructures.list
    this._placeExtensionsDynamically(plannedStructures, centerX, centerY, addStructure);

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
};
