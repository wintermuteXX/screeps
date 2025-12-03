const Behavior = require("_behavior");
const Log = require("Log");
const b = new Behavior("get_resources");

/**
 * When: Behavior is active if creep is empty and has a transport order
 */
b.when = function (creep, rc) {
  if (creep.store.getUsedCapacity() > 0) {
    return false;
  }
  const order = rc.getTransportOrder(creep);
  return order !== null && order !== undefined;
};

/**
 * Completed: Behavior is completed when creep has resources or no target
 */
b.completed = function (creep, rc) {
  return creep.store.getUsedCapacity() > 0 || creep.target === null;
};

/**
 * Work: Main logic for getting resources from sources
 */
b.work = function (creep, rc) {
  const target = creep.getTarget();
  let resourceType = null;
  let amount = null;

  // Get or update transport order
  if (!target) {
    const resource = rc.getTransportOrder(creep);
    if (!resource) {
      return;
    }
    
    creep.target = resource.id;
    resourceType = resource.resourceType;
    amount = resource.amount;
    
    this._updateMemory(creep, resourceType, amount, resource.id);
  } else {
    // Target already set - get resource info from memory
    const resourceInfo = this._getResourceFromMemory(creep, target.id);
    if (!resourceInfo) {
      creep.target = null;
      return;
    }
    resourceType = resourceInfo.resourceType;
    amount = resourceInfo.amount;
  }

  // Execute resource collection
  if (target && resourceType) {
    this._collectResource(creep, target, resourceType, amount);
  }
};

/**
 * Helper: Update creep memory with resource information
 */
b._updateMemory = function (creep, resourceType, amount, targetId) {
  if (!creep.memory.resources) {
    creep.memory.resources = [];
  }
  
  const existingEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
  if (existingEntry) {
    existingEntry.target = targetId;
    existingEntry.amount = amount;
  } else {
    creep.memory.resources.push({
      resourceType: resourceType,
      amount: amount,
      target: targetId
    });
  }
};

/**
 * Helper: Get resource information from memory based on target ID
 * Returns { resourceType, amount } or null
 */
b._getResourceFromMemory = function (creep, targetId) {
  if (!creep.memory.resources || !Array.isArray(creep.memory.resources)) {
    return null;
  }
  
  const resourceEntry = creep.memory.resources.find(r => r.target === targetId);
  if (resourceEntry) {
    return {
      resourceType: resourceEntry.resourceType,
      amount: resourceEntry.amount
    };
  }
  
  return null;
};

/**
 * Helper: Collect resource from target (withdraw or pickup)
 */
b._collectResource = function (creep, target, resourceType, plannedAmount) {
  const actualTarget = creep.getTarget();
  if (!actualTarget || actualTarget.id !== target.id) {
    return;
  }

  let result;
  
  // Check if target has a store (structures, tombstones, ruins) -> withdraw
  // Otherwise (Dropped Resources) -> pickup
  if (actualTarget.store !== undefined) {
    result = this._withdrawResource(creep, actualTarget, resourceType, plannedAmount);
  } else {
    result = this._pickupResource(creep, actualTarget, resourceType);
  }
  
  // Handle result
  this._handleCollectionResult(creep, actualTarget, resourceType, result);
};

/**
 * Helper: Withdraw resource from structure/tombstone/ruin
 */
b._withdrawResource = function (creep, target, resourceType, plannedAmount) {
  const available = target.store[resourceType] || 0;
  const freeCapacity = creep.store.getFreeCapacity(resourceType) || 0;
  const withdrawAmount = plannedAmount 
    ? Math.min(plannedAmount, available, freeCapacity) 
    : Math.min(available, freeCapacity);
  
  if (withdrawAmount <= 0) {
    Log.debug(
      `${creep} cannot withdraw ${resourceType}: available=${available}, freeCapacity=${freeCapacity}`,
      "get_resources"
    );
    creep.target = null;
    return ERR_NOT_ENOUGH_RESOURCES;
  }
  
  const result = creep.withdraw(target, resourceType, withdrawAmount);
  Log.debug(
    `${creep} tries to withdraw ${resourceType} (${withdrawAmount}) from ${target}: ${result}`,
    "get_resources"
  );
  
  return result;
};

/**
 * Helper: Pickup dropped resource
 */
b._pickupResource = function (creep, target, resourceType) {
  const result = creep.pickup(target);
  Log.debug(
    `${creep} tries to pickup ${resourceType || "resource"} from ${target}: ${result}`,
    "get_resources"
  );
  return result;
};

/**
 * Helper: Handle the result of resource collection
 */
b._handleCollectionResult = function (creep, target, resourceType, result) {
  switch (result) {
    case OK:
      Log.info(`${creep} successfully collected ${resourceType} from ${target}`, "get_resources");
      this._updateMemoryWithActualAmount(creep, resourceType);
      creep.target = null;
      break;
      
    case ERR_INVALID_TARGET:
    case ERR_NOT_ENOUGH_RESOURCES:
      Log.warn(
        `${creep} had a problem collecting ${resourceType} from ${target}. Status: ${result}`,
        "get_resources"
      );
      creep.target = null;
      break;
      
    case ERR_FULL:
      Log.info(`${creep} is full, cannot collect more ${resourceType}`, "get_resources");
      this._updateMemoryWithActualAmount(creep, resourceType);
      creep.target = null;
      break;
      
    case ERR_NOT_IN_RANGE:
      creep.travelTo(target, { maxRooms: 0 });
      break;
      
    default:
      Log.warn(
        `${creep} got unknown result from collection (${target}): ${result}`,
        "get_resources"
      );
  }
};

/**
 * Helper: Update memory with actual amount collected
 */
b._updateMemoryWithActualAmount = function (creep, resourceType) {
  if (!creep.memory.resources || !Array.isArray(creep.memory.resources)) {
    return;
  }
  
  const resourceEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
  if (resourceEntry) {
    resourceEntry.amount = creep.store[resourceType] || 0;
  }
};

module.exports = b;