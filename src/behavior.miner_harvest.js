const Behavior = require("./behavior.base");
const Log = require("./lib.log");

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
  return creep.moveAndAct(
    container,
    () => {
      creep.repair(container);
      return true;
    },
    "REPAIRING_CONTAINER",
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
  if (creep.transferResourcesToContainer(container)) {
    return true;
  }

  // Priority 2: Pick up dropped resources
  if (creep.pickupDroppedResources(container)) {
    return true;
  }

  // Idle but nothing to do
  return false;
}

// ============================================================================
// Helper: Link transfer handlers
// ============================================================================

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
    return creep.transferEnergyToLink(link);
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
    return creep.transferEnergyToLink(link);
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

  creep.transferIfNear(link, RESOURCE_ENERGY, "TRANSFERRING_TO_LINK");
}

// ============================================================================
// Behavior Class
// ============================================================================

class MinerHarvestBehavior extends Behavior {
  constructor() {
    super("miner_harvest");
  }

  when() {
    return true;
  }

  completed() {
    return false;
  }

  work(creep, rc) {
    // Get source
    const source = creep.getAvailableSource(rc);
    if (!source) {
      Log.warn(`${creep} does not find free source in room ${creep.room}`, "miner_harvest");
      return;
    }

    creep.target = source.id;

    // Get link and container references
    const link = source.link;
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
  }
}

module.exports = new MinerHarvestBehavior();
