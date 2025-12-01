const Behavior = require("_behavior");
const Log = require("Log");
const b = new Behavior("transfer_resources");

b.when = function (creep, rc) {
  Log.debug(`${creep} is checking "when" in transfer_resources`, "transfer_resources")
  // If creep has resources, behavior should stay active to find delivery target
  // Even if no order is assigned yet, behavior should remain active
  // This ensures transporters with leftover resources don't get stuck
  if (creep.store.getUsedCapacity() === 0) return false;
  
  // If resourceType is not set in memory, try to find it from store
  if (!creep.memory.resourceType) {
    for (const resourceType in creep.store) {
      if (creep.store[resourceType] > 0) {
        creep.memory.resourceType = resourceType;
        break;
      }
    }
  }
  
  // Check if there's a delivery order
  const order = rc.getDeliveryOrder(creep);
  if (order !== null && order !== undefined) {
    return true;
  }
  
  // No order assigned, but creep has resources - keep behavior active
  // The work() function will try to find a matching order
  return true;
};

b.completed = function (creep, rc) {
  Log.debug(`${creep} is checking "completed" in transfer_resources`, "transfer_resources")
  // Behavior is only completed if creep has no resources left
  // If creep still has resources, behavior should stay active to find delivery target
  if (creep.store.getUsedCapacity() === 0) return true;
  
  // Creep has resources - check if there's a valid target
  let tar = creep.getTarget();
  if (!tar) {
    // No target - but if creep has resources, behavior should stay active
    // to try finding a delivery order next tick
    return false;
  }
  return false;
};

b.work = function (creep, rc) {
  Log.debug(`${creep} is performing "work" in transfer_resources`, "transfer_resources")
  let target = creep.getTarget();
  
  // Find resource type from store if not set in memory
  let creepRes = creep.memory.resourceType;
  if (!creepRes) {
    // Find first resource type with amount > 0
    for (const resourceType in creep.store) {
      if (creep.store[resourceType] > 0) {
        creepRes = resourceType;
        break;
      }
    }
  }
  if (!creepRes) {
    // No resources found - should not happen if when() worked correctly
    return;
  }
  
  // Update memory with resource type if not set
  if (!creep.memory.resourceType) {
    creep.memory.resourceType = creepRes;
  }
  
  if (!target || target === null) {
    creep.target = null;
    let job = rc.getDeliveryOrder(creep);
    
    if (job !== null && job !== undefined) {
      let theObject = Game.getObjectById(job.id);

      if (theObject && job.amount > 0) {
        creep.target = job.id;
        creep.amount = job.amount;
        creep.exact = job.exact;
        target = creep.getTarget();
        Log.debug(`${creep} will deliver ${job.resourceType} to ${target} `, "transfer_resources");
      }
    } else {
      // No delivery order found - but creep has resources
      // Try to find a matching need for any resource the creep has
      const needsResources = rc.needsResources();
      if (needsResources && needsResources.length > 0) {
        // Find a need that matches any resource the creep has
        for (const resourceType in creep.store) {
          if (creep.store[resourceType] > 0) {
            const matchingNeed = needsResources.find(need => 
              need.resourceType === resourceType && 
              need.amount > 0 &&
              (rc.getCreeps(null, need.id).length === 0 || need.id === creep.room.controller.memory.containerID)
            );
            if (matchingNeed) {
              // Found a matching need - set it as target
              creep.memory.resourceType = resourceType;
              creep.target = matchingNeed.id;
              creep.amount = matchingNeed.amount;
              creep.exact = matchingNeed.exact || false;
              target = creep.getTarget();
              Log.debug(`${creep} found matching need for ${resourceType} to ${target}`, "transfer_resources");
              break;
            }
          }
        }
      }
      
      // If still no target, try to deliver to terminal or drop resources
      if (!target) {
        // Try terminal first (if available)
        const terminal = creep.room.terminal;
        if (terminal && terminal.my) {
          // Check if terminal has free capacity for this resource
          const freeCapacity = terminal.store.getFreeCapacity(creepRes);
          if (freeCapacity > 0) {
            creep.target = terminal.id;
            target = terminal;
            Log.info(`${creep} has resources (${creepRes}) but no delivery order found. Delivering to terminal.`, "transfer_resources");
          } else {
            // Terminal is full for this resource - try to drop
            // But first check if we can transfer other resources to terminal
            let foundAlternative = false;
            for (const resourceType in creep.store) {
              if (creep.store[resourceType] > 0 && resourceType !== creepRes) {
                const altFreeCapacity = terminal.store.getFreeCapacity(resourceType);
                if (altFreeCapacity > 0) {
                  creep.memory.resourceType = resourceType;
                  creep.target = terminal.id;
                  target = terminal;
                  Log.info(`${creep} terminal full for ${creepRes}, switching to ${resourceType} for terminal delivery.`, "transfer_resources");
                  foundAlternative = true;
                  break;
                }
              }
            }
            if (!foundAlternative) {
              // Terminal is full - drop current resource
              Log.warn(`${creep} has resources (${creepRes}) but no delivery order found and terminal is full. Dropping resources.`, "transfer_resources");
              creep.drop(creepRes);
              creep.memory.resourceType = null;
              return;
            }
          }
        } else {
          // No terminal - drop resources
          Log.warn(`${creep} has resources (${creepRes}) but no delivery order found and no terminal. Dropping resources.`, "transfer_resources");
          creep.drop(creepRes);
          creep.memory.resourceType = null;
          return;
        }
      }
    }
  }

  if (target) {
    let result;
    if (creep.exact === true) {
      result = creep.transfer(target, creepRes, Math.min(creep.amount, creep.store[creepRes]));
    } else {
      result = creep.transfer(target, creepRes);
    }

    switch (result) {
      case OK:
        Log.info(`${creep} successfully transfers ${creep.memory.resourceType} to ${target}`, "transfer_resources");
        creep.target = null;
        creep.exact = false;
        creep.amount = 0;
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} had not enough resources. Why is this happening? Investigate!`, "transfer_resources");
        creep.target = null;
        creep.exact = false;
        creep.amount = 0;
        break;
      case ERR_FULL:
        Log.info(`${creep} ${target} is full. This shouldn't happen anymore`, "transfer_resources");
        creep.target = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target, {
          maxRooms: 0
        });
        break;

      default:
        Log.warn(`${creep} has unknown result from transfer to (${target}): ${result}`, "transfer_resources");
    }
  }
};
module.exports = b;