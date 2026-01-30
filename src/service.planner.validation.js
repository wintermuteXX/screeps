const CONSTANTS = require("./config.constants");

module.exports = function applyPlannerValidation(RoomPlanner) {
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
    }

    // No structures or sites allowed
    return structures.length === 0 && sites.length === 0;
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
   * Helper: Checks if position is too close to a list of targets
   */
  RoomPlanner.prototype._isTooCloseToTargets = function (x, y, targets, range) {
    if (!targets || targets.length === 0) {
      return false;
    }

    const pos = new RoomPosition(x, y, this.roomName);
    for (const target of targets) {
      if (pos.getRangeTo(target.pos) <= range) {
        return true;
      }
    }

    return false;
  };

  /**
   * Helper: Checks if position is too close to sources (Range=2)
   */
  RoomPlanner.prototype._isTooCloseToSource = function (x, y) {
    const sources = this.room.find(FIND_SOURCES);
    return this._isTooCloseToTargets(x, y, sources, 2);
  };

  /**
   * Helper: Checks if position is too close to controller (Range=3)
   */
  RoomPlanner.prototype._isTooCloseToController = function (x, y) {
    if (!this.room.controller) {
      return false;
    }

    return this._isTooCloseToTargets(x, y, [this.room.controller], 3);
  };

  /**
   * Helper: Checks if position is too close to mineral (Range=2)
   */
  RoomPlanner.prototype._isTooCloseToMineral = function (x, y) {
    const minerals = this.room.find(FIND_MINERALS);
    return this._isTooCloseToTargets(x, y, minerals, 2);
  };

  /**
   * Helper: Validates position for structure placement (BUNKER_LAYOUT, Extensions, Labs)
   * Checks: boundaries, walls, sources (Range=2), controller (Range=3), mineral (Range=2)
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

    // 4. Check if too close to mineral (Range=2)
    if (this._isTooCloseToMineral(x, y)) {
      return false;
    }

    return true;
  };
};
