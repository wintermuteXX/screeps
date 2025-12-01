const Behavior = require("_behavior");
const Log = require("Log");
const b = new Behavior("get_resources");

b.when = function (creep, rc) {
  Log.debug(`${creep} is running "when"`, "get_resources");
  if (creep.store.getUsedCapacity() > 0) return false;
  const order = rc.getTransportOrder(creep);
  if (order === null || order === undefined) return false;
  return true;
};

b.completed = function (creep, rc) {
  Log.debug(`${creep} is running "completed"`, "get_resources");
  return (creep.store.getUsedCapacity() > 0 || creep.target === null);
};

b.work = function (creep, rc) {
  Log.debug(`${creep} is running "work"`, "get_resources");
  let target = creep.getTarget();
  let resourceType = null;
  let amount = null;

  if (!target) {
    const resource = rc.getTransportOrder(creep);
    if (resource !== null && resource !== undefined) {
      creep.target = resource.id;
      target = creep.getTarget();
      resourceType = resource.resourceType;
      amount = resource.amount;
      
      // Update memory: support both old and new format
      if (creep.memory.resources && Array.isArray(creep.memory.resources)) {
        // New multi-resource format
        const existingEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
        if (existingEntry) {
          existingEntry.target = resource.id;
          existingEntry.amount = amount;
        } else {
          creep.memory.resources.push({
            resourceType: resourceType,
            amount: amount,
            target: resource.id
          });
        }
      } else {
        // Old format - backward compatibility
        creep.memory.resourceType = resourceType;
        creep.memory.amount = amount;
      }
    }
  } else {
    // Target already set - get resource type from memory
    if (creep.memory.resources && Array.isArray(creep.memory.resources)) {
      // Find resource entry for current target
      const resourceEntry = creep.memory.resources.find(r => r.target === target.id);
      if (resourceEntry) {
        resourceType = resourceEntry.resourceType;
        amount = resourceEntry.amount;
      }
    } else if (creep.memory.resourceType) {
      // Old format
      resourceType = creep.memory.resourceType;
      amount = creep.memory.amount;
    }
  }

  if (target && resourceType) {
    let result;
    // Check if target has a store (structures, tombstones, ruins) -> withdraw
    // Sonst (Dropped Resources) -> pickup
    if (target.store !== undefined) {
      // Calculate how much to withdraw
      const available = target.store[resourceType] || 0;
      const freeCapacity = creep.store.getFreeCapacity(resourceType) || 0;
      const withdrawAmount = amount ? Math.min(amount, available, freeCapacity) : Math.min(available, freeCapacity);
      
      if (withdrawAmount > 0) {
        result = creep.withdraw(target, resourceType, withdrawAmount);
        Log.debug(`creep${creep} tries to withdraw ${resourceType} (${withdrawAmount}) from ${target}: ${result}`, "get_resources");
      } else {
        // No capacity or no resources available
        Log.debug(`${creep} cannot withdraw ${resourceType}: available=${available}, freeCapacity=${freeCapacity}`, "get_resources");
        creep.target = null;
        return;
      }
    } else {
      // Dropped resource - pickup
      result = creep.pickup(target, resourceType);
      Log.debug(`creep${creep} tries to pickup ${resourceType} from ${target}: ${result}`, "get_resources");
    }
    
    switch (result) {
      case OK:
        Log.info(`${creep} successfully picked up ${resourceType} from ${target}`, "get_resources");
        // Update memory with actual amount picked up
        if (creep.memory.resources && Array.isArray(creep.memory.resources)) {
          const resourceEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
          if (resourceEntry) {
            resourceEntry.amount = creep.store[resourceType] || 0;
          }
        }
        creep.target = null;
        break;
      case ERR_INVALID_TARGET:
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} had a problem. Status ${result} with target ${target}`, "get_resources");
        creep.target = null;
        break;
      case ERR_FULL:
        Log.info(`${creep} is full, cannot pick up more ${resourceType}`, "get_resources");
        creep.target = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target, {
          maxRooms: 0
        });
        break;

      default:
        Log.warn(`${creep} gets unknown result from pickup/withdraw(${target}): ${result}`, "get_resources");
    }
  }
};
module.exports = b;