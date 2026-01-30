const CONSTANTS = require("./config.constants");

module.exports = function applyPlannerMemory(RoomPlanner) {
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
        layoutGenerated: undefined, // undefined = not checked yet, true = success, false = failed
        plannedStructures: {
          list: [], // Other structures (non-extensions)
          extensions: [], // Extensions stored separately for better organization
        },
        visualizeUntil: null,
      };
    }

    // Ensure plannedStructures is an object with list and extensions
    if (
      !Memory.rooms[this.roomName].planner.plannedStructures ||
      typeof Memory.rooms[this.roomName].planner.plannedStructures !== "object" ||
      Array.isArray(Memory.rooms[this.roomName].planner.plannedStructures)
    ) {
      Memory.rooms[this.roomName].planner.plannedStructures = {
        list: Array.isArray(Memory.rooms[this.roomName].planner.plannedStructures)
          ? Memory.rooms[this.roomName].planner.plannedStructures.filter(
              (s) => s.structureType !== STRUCTURE_EXTENSION,
            )
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
    const maxAllowed = CONTROLLER_STRUCTURES[structureType]
      ? CONTROLLER_STRUCTURES[structureType][rcl]
      : 0;

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
   * Stores a special structure (Container/Link) position in memory
   */
  RoomPlanner.prototype._storeSpecialStructure = function (identifier, x, y, structureType, targetId) {
    // Ensure plannedStructures exists
    if (
      !this.memory.plannedStructures ||
      typeof this.memory.plannedStructures !== "object" ||
      Array.isArray(this.memory.plannedStructures)
    ) {
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

    const stored = this.memory.plannedStructures.list.find(
      (s) => s.specialIdentifier && s.specialIdentifier === identifier,
    );

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
};
