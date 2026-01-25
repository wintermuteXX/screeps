const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");
const duneConfig = require("./config.dune");

module.exports = function applyPlannerPlacement(RoomPlanner) {
  /**
   * Detects existing containers and links for sources and controller
   * and stores their positions in memory for use in the layout
   */
  RoomPlanner.prototype._detectExistingSpecialStructures = function () {
    // Detect containers and links at sources
    const sources = this.cache.get("sources", () => {
      return this.room.find(FIND_SOURCES);
    });
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const containerIdentifier = `source_${i}`;
      const linkIdentifier = `source_link_${i}`;

      this._storeNearbySpecialStructure(
        source.pos,
        CONSTANTS.PLANNER.CONTAINER_DEFAULT_RANGE,
        STRUCTURE_CONTAINER,
        containerIdentifier,
        source.id,
      );
      this._storeNearbySpecialStructure(
        source.pos,
        CONSTANTS.PLANNER.LINK_PLACEMENT_RANGE,
        STRUCTURE_LINK,
        linkIdentifier,
        source.id,
      );
    }

    // Detect container and link at controller
    if (this.room.controller) {
      const controller = this.room.controller;
      const containerIdentifier = "controller";
      const linkIdentifier = "controller_link";

      this._storeNearbySpecialStructure(
        controller.pos,
        CONSTANTS.PLANNER.CONTAINER_CONTROLLER_RANGE,
        STRUCTURE_CONTAINER,
        containerIdentifier,
        controller.id,
      );
      this._storeNearbySpecialStructure(
        controller.pos,
        CONSTANTS.PLANNER.LINK_PLACEMENT_RANGE,
        STRUCTURE_LINK,
        linkIdentifier,
        controller.id,
      );
    }
  };

  /**
   * Cache-aware lookup for an existing structure or construction site and store it.
   */
  RoomPlanner.prototype._storeNearbySpecialStructure = function (
    pos,
    range,
    structureType,
    identifier,
    targetId,
  ) {
    const nearbyStructures = pos.findInRange(FIND_STRUCTURES, range, {
      filter: (s) => s.structureType === structureType,
    });
    const nearbySites = pos.findInRange(FIND_CONSTRUCTION_SITES, range, {
      filter: (s) => s.structureType === structureType,
    });

    if (nearbyStructures.length > 0) {
      const structurePos = nearbyStructures[0].pos;
      this._storeSpecialStructure(identifier, structurePos.x, structurePos.y, structureType, targetId);
      return;
    }

    if (nearbySites.length > 0) {
      const sitePos = nearbySites[0].pos;
      this._storeSpecialStructure(identifier, sitePos.x, sitePos.y, structureType, targetId);
    }
  };

  /**
   * Platziert Construction Sites basierend auf RCL
   */
  RoomPlanner.prototype._placeConstructionSites = function (rcl) {
    const existingSites = this.cache.get("constructionSites", () => {
      return this.room.find(FIND_CONSTRUCTION_SITES);
    });

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
    const minerals = this.cache.get("minerals", () => {
      return this.room.find(FIND_MINERALS);
    });
    if (minerals.length === 0) return;

    const mineral = minerals[0];

    // Check if extractor already exists
    const existingExtractor = mineral.pos
      .lookFor(LOOK_STRUCTURES)
      .find((s) => s.structureType === STRUCTURE_EXTRACTOR);
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
    const sources = this.cache.get("sources", () => {
      return this.room.find(FIND_SOURCES);
    });

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
      type === "controller"
        ? CONSTANTS.PLANNER.CONTAINER_CONTROLLER_RANGE
        : CONSTANTS.PLANNER.CONTAINER_DEFAULT_RANGE;
    this._placeStructureNear(pos, STRUCTURE_CONTAINER, range, type, false, identifier, targetId);
  };

  /**
   * Platziert Links bei Sources
   */
  RoomPlanner.prototype._placeSourceLinks = function () {
    const sources = this.cache.get("sources", () => {
      return this.room.find(FIND_SOURCES);
    });

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const identifier = `source_link_${i}`;

      // Try to find the container for this source first
      const containerIdentifier = `source_${i}`;
      const containerPosition = this._getStoredSpecialStructure(containerIdentifier);

      if (containerPosition) {
        // Container existiert - platziere Link direkt daneben (Range 1)
        const containerPos = new RoomPosition(containerPosition.x, containerPosition.y, this.roomName);
        this._placeLinkNearContainer(containerPos, "source", identifier, source.id);
      } else {
        // Container does not exist yet - place a link near the source (fallback)
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
        Log.warn(
          `RoomPlanner: Stored position for ${identifier} is now a wall, finding new position`,
          "RoomPlanner",
        );
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
          this.room.createConstructionSite(storedPos, structureType);
          return;
        }

        // Position is blocked - need to find new position
        Log.warn(
          `RoomPlanner: Stored position for ${identifier} is blocked, finding new position`,
          "RoomPlanner",
        );
        this._removeStoredSpecialStructure(identifier);
        // Fall through to find new position
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
};
