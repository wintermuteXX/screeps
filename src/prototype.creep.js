/**
 * Creep Prototype Extensions
 */

Object.defineProperty(Creep.prototype, "behavior", {
  get: function () {
    return this.memory.behavior || null;
  },
  set: function (newBehavior) {
    if (newBehavior !== null) {
      this.memory.behavior = newBehavior;
    } else {
      delete this.memory.behavior;
    }
    this.target = null;
  },
});

Object.defineProperty(Creep.prototype, "role", {
  get: function () {
    return this.memory.role || null;
  },
  set: function (newRole) {
    if (newRole !== null) {
      this.memory.role = newRole;
    } else {
      delete this.memory.role;
    }
  },
});

Object.defineProperty(Creep.prototype, "target", {
  get: function () {
    return this.memory.target || null;
  },
  set: function (newTarget) {
    if (newTarget !== null) {
      this.memory.target = newTarget;
    } else {
      delete this.memory.target;
    }
  },
});

/**
 * Get the target object by ID
 * @returns {Object|null} The target object or null if not found
 */
Creep.prototype.getTarget = function () {
  if (!this.target) {
    return null;
  }
  return Game.getObjectById(this.target);
};

/**
 * Multiple targets system
 * Each target contains: { id: string, action: "withdraw"|"transfer", resourceType: string, amount: number }
 */
Object.defineProperty(Creep.prototype, "targets", {
  get: function () {
    // Only read, don't write to memory unnecessarily
    return this.memory.targets || [];
  },
  set: function (newTargets) {
    if (Array.isArray(newTargets)) {
      this.memory.targets = newTargets;
    } else {
      this.memory.targets = [];
    }
  },
});

/**
 * Add a target to the queue
 * @param {string} id - Target object ID
 * @param {string} action - "withdraw" or "transfer"
 * @param {string} resourceType - Resource type (e.g., RESOURCE_ENERGY)
 * @param {number} amount - Amount to withdraw/transfer
 */
Creep.prototype.addTarget = function (id, action, resourceType, amount) {
  if (!this.memory.targets) {
    this.memory.targets = [];
  }
  this.memory.targets.push({
    id: id,
    action: action,
    resourceType: resourceType,
    amount: amount || 0,
  });
};

/**
 * Remove the first target from the queue
 */
Creep.prototype.removeFirstTarget = function () {
  if (this.memory.targets && this.memory.targets.length > 0) {
    this.memory.targets.shift();
  }
};

/**
 * Clear all targets
 */
Creep.prototype.clearTargets = function () {
  this.memory.targets = [];
};

/**
 * Get the first target as an object
 * @returns {Object|null} The target object or null if not found
 */
Creep.prototype.getFirstTarget = function () {
  if (!this.memory.targets || this.memory.targets.length === 0) {
    return null;
  }
  const targetData = this.memory.targets[0];
  if (!targetData || !targetData.id) {
    return null;
  }
  return Game.getObjectById(targetData.id);
};

/**
 * Get the first target data (id, action, resourceType, amount)
 * @returns {Object|null} The target data or null
 */
Creep.prototype.getFirstTargetData = function () {
  if (this.memory.targets && this.memory.targets.length > 0) {
    return this.memory.targets[0];
  }
  return null;
};

/**
 * Get harvest power per tick for this creep
 * Cached per tick for performance (body doesn't change during a tick)
 * @returns {number} Energy units this creep can harvest per tick
 *
 * Examples:
 * - 1 normal WORK part = 2 energy/tick (HARVEST_POWER)
 * - 1 WORK with UO boost (harvest: 3) = 6 energy/tick
 * - 1 WORK with XUHO2 boost (harvest: 7) = 14 energy/tick
 *
 * MEMORY MANAGEMENT:
 * - Cache properties (_harvestPowerCache, _harvestPowerCacheTick) are stored on the creep object
 * - These are automatically cleaned up when the creep dies via memhack.js cleanup
 * - No manual cleanup required - memhack removes dead creep memory each tick
 */
Creep.prototype.getHarvestPowerPerTick = function() {
  // Cache per tick (body doesn't change during a tick)
  if (this._harvestPowerCache && this._harvestPowerCacheTick === Game.time) {
    return this._harvestPowerCache;
  }

  if (!this.body || !Array.isArray(this.body)) {
    this._harvestPowerCache = 0;
    this._harvestPowerCacheTick = Game.time;
    return 0;
  }

  let totalHarvestPower = 0;

  for (const part of this.body) {
    // Only count WORK parts
    if (!part || part.type !== WORK) {
      continue;
    }

    // Skip inactive/damaged parts (hits === 0 means part is destroyed)
    if (part.hits <= 0) {
      continue;
    }

    // Base harvest power for this WORK part
    if (!part.boost) {
      totalHarvestPower += HARVEST_POWER;
      continue;
    }

    // BOOSTS structure: BOOSTS.work[boostResourceType].harvest
    if (part.boost && BOOSTS && BOOSTS.work && BOOSTS.work[part.boost] && BOOSTS.work[part.boost].harvest) {
      totalHarvestPower += BOOSTS.work[part.boost].harvest;
    }
  }

  // Cache the result
  this._harvestPowerCache = totalHarvestPower;
  this._harvestPowerCacheTick = Game.time;
  return totalHarvestPower;
};

/**
 * Get first resource type from creep store
 * @returns {string|null} Resource type or null if store is empty
 */
Creep.prototype.getFirstResourceType = function () {
  for (const resourceType in this.store) {
    if (this.store[resourceType] > 0) {
      return resourceType;
    }
  }
  return null;
};

/**
 * Move to target and execute action if near
 * @param {RoomObject|Structure|Creep|Source|Resource} target - Target to move to
 * @param {Function} action - Action to execute when near (returns true if action was taken)
 * @param {string} statusPrefix - Status prefix for logging (optional)
 * @param {number} range - Range to consider "near" (default: 1)
 * @returns {boolean} True if action was taken or movement initiated
 */
Creep.prototype.moveAndAct = function (target, action, statusPrefix, range = 1) {
  if (!target) return false;

  const isNear = range === 1
    ? this.pos.isNearTo(target)
    : this.pos.inRangeTo(target, range);

  if (isNear) {
    return action();
  } else {
    this.travelTo(target);
    return true;
  }
};

/**
 * Transfer resource to target if near, otherwise move
 * @param {Structure|Creep} target - Target to transfer to
 * @param {string} resourceType - Resource type to transfer
 * @param {string} statusPrefix - Status prefix for logging (optional)
 * @returns {boolean} True if transfer was attempted or movement initiated
 */
Creep.prototype.transferIfNear = function (target, resourceType, statusPrefix) {
  return this.moveAndAct(
    target,
    () => {
      const amount = this.store[resourceType] || 0;
      if (amount > 0) {
        this.transfer(target, resourceType);
        return true;
      }
      return false;
    },
    statusPrefix,
  );
};

/**
 * Get available source for this creep (finds source with free spaces and low harvest power)
 * @param {ControllerRoom} rc - The room controller
 * @returns {Source|null} Available source or null if none found
 */
Creep.prototype.getAvailableSource = function (rc) {
  let source = this.getTarget();
  if (source === null) {
    // Use cached find() instead of getSources()
    source = _.find(rc.find(FIND_SOURCES), (s) => {
      // Check free spaces: freeSpacesCount - creepsTargeting > 0
      const freeSpaces = s.freeSpacesCount;
      const creepsTargeting = rc.getCreeps(null, s.id).length;
      const availableSpaces = freeSpaces - creepsTargeting;
      
      if (availableSpaces <= 0) {
        return false; // No free spaces
      }
      
      // Check if current harvest power is below 5
      let currentHarvestPower = 0;
      const harvestingCreeps = rc.getCreeps(null, s.id);
      for (const hCreep of harvestingCreeps) {
        if (hCreep.pos.isNearTo(s)) {
          currentHarvestPower += hCreep.getHarvestPowerPerTick();
        }
      }
      
      return currentHarvestPower < 5;
    });
  }
  return source;
};

/**
 * Transfer resources from creep to container
 * @param {StructureContainer} container - Container to transfer to
 * @returns {boolean} True if transfer was attempted or movement initiated
 */
Creep.prototype.transferResourcesToContainer = function (container) {
  const containerFreeCapacity = container.store ? container.store.getFreeCapacity() : 0;
  if (this.store.getUsedCapacity() === 0 || containerFreeCapacity === 0) {
    return false;
  }

  const resourceType = this.getFirstResourceType();
  if (!resourceType) return false;

  return this.moveAndAct(
    container,
    () => {
      const amount = this.store[resourceType];
      this.transfer(container, resourceType);
      return true;
    },
    "IDLE_MOVING_TO_CONTAINER",
  );
};

/**
 * Pick up dropped resources near container
 * @param {StructureContainer} container - Container to use as reference point
 * @returns {boolean} True if pickup was attempted or movement initiated
 */
Creep.prototype.pickupDroppedResources = function (container) {
  const containerFreeCapacity = container.store ? container.store.getFreeCapacity() : 0;
  if (this.store.getFreeCapacity() === 0 || containerFreeCapacity === 0) {
    return false;
  }

  const droppedResources = container.pos.findInRange(FIND_DROPPED_RESOURCES, 5);
  if (droppedResources.length === 0) {
    return false;
  }

  const closestResource = container.pos.findClosestByRange(droppedResources);
  if (!closestResource) {
    return false;
  }

  return this.moveAndAct(
    closestResource,
    () => {
      this.pickup(closestResource);
      return true;
    },
    "IDLE_MOVING_TO_RESOURCE",
  );
};

/**
 * Transfer energy from creep to link
 * @param {StructureLink} link - Link to transfer to
 * @returns {boolean} True if transfer was attempted or movement initiated
 */
Creep.prototype.transferEnergyToLink = function (link) {
  if (this.store[RESOURCE_ENERGY] === 0) {
    return false;
  }

  return this.transferIfNear(link, RESOURCE_ENERGY, "TRANSFERRING_TO_LINK");
};

/**
 * Finds an unvisited room within 2 hops from the start room that needs analysis
 * @returns {Object|null} Object with roomName and distance, or null if none found
 */
Creep.prototype.findUnvisitedRoom = function () {
  const currentRoom = this.room.name;

  // Find start room (home room from memory, fallback to current room)
  const startRoom = this.memory.home || currentRoom;

  // Calculate distance from start room
  const distanceFromStart = Game.map.getRoomLinearDistance(startRoom, currentRoom);

  const candidates = [];

  // Get exits from current room
  const exits = Game.map.describeExits(currentRoom);

  // Level 1: Directly adjacent rooms (max 1 hop from start)
  for (const direction in exits) {
    const roomName = exits[direction];
    const roomStatus = Game.map.getRoomStatus(roomName);
    const distFromStart = Game.map.getRoomLinearDistance(startRoom, roomName);

    // Check if room is normal AND not hostile AND needs analysis
    if (roomStatus.status === "normal" &&
        distFromStart <= 2 &&
        !Room.isHostile(roomName) &&
        Room.needsAnalysis(roomName)) {
      candidates.push({ roomName, distance: distFromStart });
    }
  }

  // Level 2: Rooms 2 hops from start (only if no Level-1 rooms found)
  if (candidates.length === 0 && distanceFromStart < 2) {
    for (const direction in exits) {
      const level1Room = exits[direction];
      const level1Status = Game.map.getRoomStatus(level1Room);
      if (level1Status.status === "normal" && !Room.isHostile(level1Room)) {
        const level1Exits = Game.map.describeExits(level1Room);
        for (const dir2 in level1Exits) {
          const roomName = level1Exits[dir2];
          const roomStatus = Game.map.getRoomStatus(roomName);
          const distFromStart = Game.map.getRoomLinearDistance(startRoom, roomName);
          // Don't go back to current room and max 2 hops from start
          if (roomName !== currentRoom &&
              roomStatus.status === "normal" &&
              distFromStart <= 2 &&
              !Room.isHostile(roomName) &&
              Room.needsAnalysis(roomName)) {
            candidates.push({ roomName, distance: distFromStart });
          }
        }
      }
    }
  }

  if (candidates.length > 0) {
    // Sort by distance (closest first) and randomly choose from the closest
    candidates.sort((a, b) => a.distance - b.distance);
    const minDist = candidates[0].distance;
    const closestCandidates = candidates.filter(c => c.distance === minDist);
    return closestCandidates[Math.floor(Math.random() * closestCandidates.length)];
  }

  return null;
};

Creep.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    let onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${this.name ? this.name : this.id}]</a>`;
  }
  return `[${this.name ? this.name : this.id}]`;
};

