const Behavior = require("_behavior");
const Log = require("Log");

const b = new Behavior("miner_harvest");

b.when = function () {
  return true;
};

b.completed = function () {
  return false;
};

/**
 * Helper: Get or find source for this miner
 */
function getSource(creep, rc) {
  let source = creep.getTarget();
  if (source === null) {
    source = _.find(rc.getSources(), function (s) {
      return (rc.getCreeps("miner", s.id).length === 0);
    });
  }
  return source;
}

/**
 * Helper: Get link reference for source (cached in source.memory)
 */
function getLink(source, creep, rc) {
  if (source.memory.linkID) {
    return Game.getObjectById(source.memory.linkID);
  } else {
    const link = rc.findNearLink(creep);
    if (link) {
      source.memory.linkID = link.id;
    }
    return link;
  }
}

/**
 * Helper: Handle container repair when idle
 */
function handleIdleRepair(creep, container) {
  if (container.hits >= container.hitsMax || !creep.store[RESOURCE_ENERGY]) {
    return false;
  }

  if (creep.pos.isNearTo(container)) {
    Log.debug(`${creep.name}: Status=REPAIRING_CONTAINER (hits=${container.hits}/${container.hitsMax})`, "miner_harvest");
    creep.repair(container);
  } else {
    Log.debug(`${creep.name}: Status=MOVING_TO_REPAIR_CONTAINER`, "miner_harvest");
    creep.travelTo(container);
  }
  return true;
}

/**
 * Helper: Handle idle resource pickup and transfer
 */
function handleIdleResourceManagement(creep, container) {
  const containerFreeCapacity = container.store ? container.store.getFreeCapacity() : 0;

  // Ensure creep is at container position
  if (!creep.pos.isEqualTo(container.pos)) {
    Log.debug(`${creep.name}: Status=IDLE_MOVING_TO_CONTAINER`, "miner_harvest");
    creep.travelTo(container);
    return true;
  }

  // Transfer resources to container if creep has any
  if (creep.store.getUsedCapacity() > 0 && containerFreeCapacity > 0) {
    for (const resourceType in creep.store) {
      if (creep.store[resourceType] > 0) {
        Log.debug(`${creep.name}: Status=IDLE_TRANSFERRING_TO_CONTAINER (${resourceType}=${creep.store[resourceType]})`, "miner_harvest");
        creep.transfer(container, resourceType);
        return true;
      }
    }
  }

  // Pick up dropped resources if creep has free capacity
  if (creep.store.getFreeCapacity() > 0 && containerFreeCapacity > 0) {
    const droppedResources = container.pos.findInRange(FIND_DROPPED_RESOURCES, 5);
    if (droppedResources.length > 0) {
      const closestResource = container.pos.findClosestByRange(droppedResources);
      if (closestResource) {
        if (creep.pos.isNearTo(closestResource)) {
          Log.debug(`${creep.name}: Status=IDLE_PICKING_UP_RESOURCE (${closestResource.resourceType}=${closestResource.amount})`, "miner_harvest");
          creep.pickup(closestResource);
        } else {
          Log.debug(`${creep.name}: Status=IDLE_MOVING_TO_RESOURCE (${closestResource.resourceType}=${closestResource.amount})`, "miner_harvest");
          creep.travelTo(closestResource);
        }
        return true;
      }
    }
  }

  // Idle but nothing to do
  if (Game.time % 10 === 0) {
    Log.debug(`${creep.name}: Status=IDLE_WAITING (source empty, no tasks)`, "miner_harvest");
  }
  return false;
}

/**
 * Helper: Transfer energy from container to link
 */
function handleLinkTransfer(creep, link, container) {
  const linkEmpty = link.energy < link.energyCapacity;
  const containerFilled = container.store && container.store[RESOURCE_ENERGY] > 0;

  if (!linkEmpty || !containerFilled) {
    return false;
  }

  // If creep already has energy, transfer directly to link
  if (creep.store[RESOURCE_ENERGY] > 0) {
    if (creep.pos.isNearTo(link)) {
      Log.debug(`${creep.name}: Status=TRANSFERRING_TO_LINK (energy=${creep.store[RESOURCE_ENERGY]})`, "miner_harvest");
      creep.transfer(link, RESOURCE_ENERGY);
    } else {
      Log.debug(`${creep.name}: Status=MOVING_TO_LINK`, "miner_harvest");
      creep.travelTo(link);
    }
    return true;
  }

  // Withdraw from container first, then transfer to link
  if (creep.pos.isNearTo(container)) {
    const withdrawResult = creep.withdraw(container, RESOURCE_ENERGY);
    if (withdrawResult === OK) {
      Log.debug(`${creep.name}: Status=WITHDREW_FROM_CONTAINER_FOR_LINK (energy=${creep.store[RESOURCE_ENERGY]})`, "miner_harvest");
      if (creep.pos.isNearTo(link)) {
        Log.debug(`${creep.name}: Status=TRANSFERRING_TO_LINK (energy=${creep.store[RESOURCE_ENERGY]})`, "miner_harvest");
        creep.transfer(link, RESOURCE_ENERGY);
      } else {
        Log.debug(`${creep.name}: Status=MOVING_TO_LINK`, "miner_harvest");
        creep.travelTo(link);
      }
    }
  } else {
    Log.debug(`${creep.name}: Status=MOVING_TO_CONTAINER_FOR_LINK_TRANSFER`, "miner_harvest");
    creep.travelTo(container);
  }
  return true;
}

/**
 * Helper: Normal harvesting behavior
 */
function handleHarvesting(creep, source, container) {
  // Move to container position first
  if (container && !creep.pos.isEqualTo(container.pos)) {
    Log.debug(`${creep.name}: Status=MOVING_TO_CONTAINER_POSITION`, "miner_harvest");
    creep.travelTo(container);
    return;
  }

  // Move to source if not near
  if (!creep.pos.isNearTo(source)) {
    Log.debug(`${creep.name}: Status=MOVING_TO_SOURCE (energy=${source.energy})`, "miner_harvest");
    creep.travelTo(source);
    return;
  }

  // Harvest source
  Log.debug(`${creep.name}: Status=HARVESTING (source energy=${source.energy}, creep energy=${creep.store[RESOURCE_ENERGY] || 0})`, "miner_harvest");
  creep.harvest(source);
}

/**
 * Helper: Transfer harvested energy to link or drop
 */
function handleEnergyTransfer(creep, link) {
  if (creep.store.getUsedCapacity() === 0) {
    return;
  }

  if (link) {
    if (creep.pos.isNearTo(link)) {
      Log.debug(`${creep.name}: Status=TRANSFERRING_TO_LINK (energy=${creep.store[RESOURCE_ENERGY]})`, "miner_harvest");
      creep.transfer(link, RESOURCE_ENERGY);
    } else {
      Log.debug(`${creep.name}: Status=MOVING_TO_LINK_TO_TRANSFER`, "miner_harvest");
      creep.travelTo(link);
    }
  }
}

/**
 * Main work function
 */
b.work = function (creep, rc) {
  // Get source
  const source = getSource(creep, rc);
  if (!source) {
    Log.warn(`creep${creep} does not find free source`, "miner_harvest");
    return;
  }

  creep.target = source.id;

  // Get link reference
  const link = getLink(source, creep, rc);
  const container = source.container;
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