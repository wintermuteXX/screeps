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

const Log = require("./lib.log");
const CacheManager = require("./utils.cache");
const applyPlannerLayout = require("./service.planner.layout");
const applyPlannerMemory = require("./service.planner.memory");
const applyPlannerPlacement = require("./service.planner.placement");
const applyPlannerValidation = require("./service.planner.validation");
const applyPlannerVisualization = require("./service.planner.visualization");

/**
 * Structure limits per RCL (from Screeps API)
 * These are used to check if a structure can be built
 */
/* const CONTROLLER_STRUCTURES = {
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
}; */


/**
 * RoomPlanner Class
 */
function RoomPlanner(room) {
  this.room = room;
  this.roomName = room.name;
  this.memory = this._initMemory();
  this._structureCounts = null; // Cache for structure counts
  this.cache = new CacheManager(); // Cache for expensive find() operations
}

/**
 * Helper: Returns a clickable room label when visible
 * @returns {Room|string} Room object if visible, otherwise room name
 */
RoomPlanner.prototype._getRoomLabel = function () {
  return this.room || Game.rooms[this.roomName] || this.roomName;
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
      Log.error(`RoomPlanner: Layout generation failed for ${this._getRoomLabel()}: ${error}`, "RoomPlanner");
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
 * Try to generate a layout for a room (even without claim)
 * Called by the scout to check whether a layout can be generated
 * @returns {boolean} True wenn Layout erfolgreich generiert wurde, false wenn fehlgeschlagen
 */
RoomPlanner.prototype.tryGenerateLayout = function () {
  // Check if a layout was already generated
  if (this.memory.layoutGenerated === true) {
    return true;
  }

  // Check if layout generation is already known to fail
  if (this.memory.layoutGenerated === false) {
    return false;
  }

  // Check if the room has a controller (even if unclaimed)
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
    Log.error(`RoomPlanner: Layout generation failed for ${this._getRoomLabel()}: ${error}`, "RoomPlanner");
    return false;
  }
};

/**
 * Recalculates extension placements
 * Removes all existing extension positions from the layout and recalculates them
 */
RoomPlanner.prototype.recalculateExtensions = function () {
  if (this.memory.layoutGenerated !== true || !this._hasCenter()) {
    Log.warn(`Cannot recalculate extensions: Layout not generated or center not found for ${this._getRoomLabel()}`, "RoomPlanner");
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
 * Resets the layout (for replanning)
 */
RoomPlanner.prototype.reset = function () {
  this.memory.centerX = null;
  this.memory.centerY = null;
  this.memory.layoutGenerated = undefined;  // Reset to undefined = not checked yet
  this.memory.plannedStructures = {
    list: [],
    extensions: [],
  };
  Log.info(`RoomPlanner: Layout for ${this._getRoomLabel()} reset`, "RoomPlanner");
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

applyPlannerValidation(RoomPlanner);
applyPlannerMemory(RoomPlanner);
applyPlannerLayout(RoomPlanner);
applyPlannerPlacement(RoomPlanner);
applyPlannerVisualization(RoomPlanner);

module.exports = RoomPlanner;
