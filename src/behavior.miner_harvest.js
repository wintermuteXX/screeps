const Behavior = require("./behavior.base");
const Log = require("./lib.log");

const b = new Behavior("miner_harvest");

b.when = function () {
  return true;
};

b.completed = function () {
  return false;
};

// ============================================================================
// Helper: Common utility functions
// ============================================================================

/**
 * Move to target and execute action if near
 * @param {Creep} creep - The creep
 * @param {RoomObject|Structure|Creep|Source|Resource} target - Target to move to
 * @param {Function} action - Action to execute when near (returns true if action was taken)
 * @param {string} statusPrefix - Status prefix for logging
 * @param {number} range - Range to consider "near" (default: 1)
 * @returns {boolean} - True if action was taken or movement initiated
 */
function moveAndAct(creep, target, action, statusPrefix, range = 1) {
  if (!target) return false;

  const isNear = range === 1
    ? creep.pos.isNearTo(target)
    : creep.pos.inRangeTo(target, range);

  if (isNear) {
    return action();
  } else {
    creep.travelTo(target);
    return true;
  }
}

/**
 * Transfer resource to target if near, otherwise move
 * @param {Creep} creep - The creep
 * @param {Structure|Creep} target - Target to transfer to
 * @param {string} resourceType - Resource type to transfer
 * @param {string} statusPrefix - Status prefix for logging
 * @returns {boolean} - True if transfer was attempted or movement initiated
 */
function transferIfNear(creep, target, resourceType, statusPrefix) {
  return moveAndAct(
    creep,
    target,
    () => {
      const amount = creep.store[resourceType] || 0;
      if (amount > 0) {
        creep.transfer(target, resourceType);
        return true;
      }
      return false;
    },
    statusPrefix,
  );
}

/**
 * Get first resource type from creep store
 * @param {Creep} creep - The creep
 * @returns {string|null} - Resource type or null
 */
function getFirstResourceType(creep) {
  for (const resourceType in creep.store) {
    if (creep.store[resourceType] > 0) {
      return resourceType;
    }
  }
  return null;
}

// ============================================================================
// Helper: Source and link management
// ============================================================================

/**
 * Get or find source for this miner
 */
function getSource(creep, rc) {
  let source = creep.getTarget();
  if (source === null) {
    // Nutzt gecachten find() Cache statt getSources()
    source = _.find(rc.find(FIND_SOURCES), (s) => {
      // Prüfe freie Plätze: freeSpacesCount - creepsTargeting > 0
      const freeSpaces = s.freeSpacesCount;
      const creepsTargeting = rc.getCreeps(null, s.id).length;
      const availableSpaces = freeSpaces - creepsTargeting;
      
      if (availableSpaces <= 0) {
        return false; // Keine freien Plätze
      }
      
      // Prüfe ob aktuelle Harvest-Power unter 5 liegt
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
}

/**
 * Get link reference for source (cached in source.memory)
 */
function getLink(source, creep, rc) {
  if (source.memory.linkID) {
    return Game.getObjectById(source.memory.linkID);
  } else {
    const link = rc.findNearLink(source);
    if (link) {
      source.memory.linkID = link.id;
    }
    return link;
  }
}

// ============================================================================
// Helper: Idle state handlers
// ============================================================================

/**
 * Handle container repair when idle
 */
function handleIdleRepair(creep, container) {
  // Container doesn't need repair
  if (container.hits >= container.hitsMax) {
    return false;
  }

  // Creep needs energy to repair - try to get it from container
  if (!creep.store[RESOURCE_ENERGY]) {
    // Check if container has energy
    if (container.store && container.store[RESOURCE_ENERGY] > 0) {
      // Withdraw energy from container first
      if (creep.pos.isNearTo(container)) {
        const withdrawResult = creep.withdraw(container, RESOURCE_ENERGY);
        if (withdrawResult === OK) {
          // Now we have energy, continue to repair
        } else {
          // Withdraw failed, can't repair
          return false;
        }
      } else {
        // Move to container to withdraw energy
        creep.travelTo(container);
        return true;
      }
    } else {
      // Container has no energy, can't repair
      return false;
    }
  }

  // Now repair the container
  return moveAndAct(
    creep,
    container,
    () => {
      creep.repair(container);
      return true;
    },
    "REPAIRING_CONTAINER",
  );
}

/**
 * Transfer resources from creep to container
 */
function transferResourcesToContainer(creep, container) {
  const containerFreeCapacity = container.store ? container.store.getFreeCapacity() : 0;
  if (creep.store.getUsedCapacity() === 0 || containerFreeCapacity === 0) {
    return false;
  }

  const resourceType = getFirstResourceType(creep);
  if (!resourceType) return false;

  return moveAndAct(
    creep,
    container,
    () => {
      const amount = creep.store[resourceType];
      creep.transfer(container, resourceType);
      return true;
    },
    "IDLE_MOVING_TO_CONTAINER",
  );
}

/**
 * Pick up dropped resources near container
 */
function pickupDroppedResources(creep, container) {
  const containerFreeCapacity = container.store ? container.store.getFreeCapacity() : 0;
  if (creep.store.getFreeCapacity() === 0 || containerFreeCapacity === 0) {
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

  return moveAndAct(
    creep,
    closestResource,
    () => {
      creep.pickup(closestResource);
      return true;
    },
    "IDLE_MOVING_TO_RESOURCE",
  );
}

/**
 * Handle idle resource pickup and transfer
 */
function handleIdleResourceManagement(creep, container) {
  // Ensure creep is at container position first
  if (!creep.pos.isEqualTo(container.pos)) {
    creep.travelTo(container);
    return true;
  }

  // Priority 1: Transfer resources to container
  if (transferResourcesToContainer(creep, container)) {
    return true;
  }

  // Priority 2: Pick up dropped resources
  if (pickupDroppedResources(creep, container)) {
    return true;
  }

  // Idle but nothing to do
  return false;
}

// ============================================================================
// Helper: Link transfer handlers
// ============================================================================

/**
 * Transfer energy from creep to link
 */
function transferEnergyToLink(creep, link) {
  if (creep.store[RESOURCE_ENERGY] === 0) {
    return false;
  }

  return transferIfNear(creep, link, RESOURCE_ENERGY, "TRANSFERRING_TO_LINK");
}

/**
 * Withdraw energy from container and transfer to link
 */
function withdrawAndTransferToLink(creep, container, link) {
  if (!creep.pos.isNearTo(container)) {
    creep.travelTo(container);
    return true;
  }

  const withdrawResult = creep.withdraw(container, RESOURCE_ENERGY);
  if (withdrawResult === OK) {
    // Now transfer to link (will move if needed)
    return transferEnergyToLink(creep, link);
  }

  return false;
}

/**
 * Transfer energy from container to link
 */
function handleLinkTransfer(creep, link, container) {
  const linkNeedsEnergy = link.energy < link.store.getCapacity(RESOURCE_ENERGY);
  const containerHasEnergy = container.store && container.store[RESOURCE_ENERGY] > 0;

  if (!linkNeedsEnergy || !containerHasEnergy) {
    return false;
  }

  // If creep already has energy, transfer directly to link
  if (creep.store[RESOURCE_ENERGY] > 0) {
    return transferEnergyToLink(creep, link);
  }

  // Otherwise, withdraw from container first, then transfer to link
  return withdrawAndTransferToLink(creep, container, link);
}

// ============================================================================
// Helper: Harvesting handlers
// ============================================================================

/**
 * Normal harvesting behavior
 */
function handleHarvesting(creep, source, container) {
  // Move to container position first (mining position)
  if (container && !creep.pos.isEqualTo(container.pos)) {
    creep.travelTo(container);
    return;
  }

  // Move to source if not near
  if (!creep.pos.isNearTo(source)) {
    creep.travelTo(source);
    return;
  }

  // Harvest source
  creep.harvest(source);
}

/**
 * Transfer harvested energy to link
 */
function handleEnergyTransfer(creep, link) {
  if (creep.store.getUsedCapacity() === 0 || !link) {
    return;
  }

  transferIfNear(creep, link, RESOURCE_ENERGY, "TRANSFERRING_TO_LINK");
}

// ============================================================================
// Main work function
// ============================================================================

b.work = function (creep, rc) {
  // Get source
  const source = getSource(creep, rc);
  if (!source) {
    Log.warn(`${creep} does not find free source in room ${creep.room}`, "miner_harvest");
    return;
  }

  creep.target = source.id;

  // Get link and container references
  const link = getLink(source, creep, rc);
  const {container} = source;
  const isIdle = source.energy === 0;

  // ============================================================
  // IDLE STATE: Source is empty
  // ============================================================
  if (isIdle && container) {
    // Priority 1: Repair container if damaged
    if (handleIdleRepair(creep, container)) {
      return;
    }

    // Priority 2: Manage resources (pickup, transfer)
    if (handleIdleResourceManagement(creep, container)) {
      return;
    }
  }

  // ============================================================
  // LINK TRANSFER: Transfer from container to link
  // ============================================================
  if (link && container) {
    if (handleLinkTransfer(creep, link, container)) {
      return;
    }
  }

  // ============================================================
  // NORMAL HARVESTING: Source has energy
  // ============================================================
  handleHarvesting(creep, source, container);
  handleEnergyTransfer(creep, link);
};

module.exports = b;
