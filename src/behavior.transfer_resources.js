const Behavior = require("_behavior");
const Log = require("Log");
const b = new Behavior("transfer_resources");

/**
 * Helper: Converts old memory format (resourceType) to new format (resources array)
 * @param {Creep} creep - The creep to convert
 */
function migrateMemoryFormat(creep) {
  if (creep.memory.resourceType && !creep.memory.resources) {
    // Convert old format to new format
    const resourceType = creep.memory.resourceType;
    const amount = creep.store[resourceType] || 0;
    if (amount > 0) {
      creep.memory.resources = [{
        resourceType: resourceType,
        amount: amount,
        target: creep.target || null
      }];
    }
    // Keep resourceType for backward compatibility during transition
  }
  
  // Ensure resources array exists
  if (!creep.memory.resources) {
    creep.memory.resources = [];
  }
}

/**
 * Helper: Gets all resource types currently in creep's store
 * @param {Creep} creep - The creep
 * @returns {Array} Array of resource types with amounts
 */
function getCarriedResources(creep) {
  const resources = [];
  for (const resourceType in creep.store) {
    const amount = creep.store[resourceType];
    if (amount > 0) {
      resources.push({
        resourceType: resourceType,
        amount: amount
      });
    }
  }
  return resources;
}

b.when = function (creep, rc) {
  Log.debug(`${creep} is checking "when" in transfer_resources`, "transfer_resources")
  // If creep has resources, behavior should stay active to find delivery target
  // Even if no order is assigned yet, behavior should remain active
  // This ensures transporters with leftover resources don't get stuck
  if (creep.store.getUsedCapacity() === 0) return false;
  
  // Migrate old memory format if needed
  migrateMemoryFormat(creep);
  
  // Update resources array with current store contents
  const carriedResources = getCarriedResources(creep);
  if (carriedResources.length > 0) {
    // Update memory with current resources (merge with existing targets if any)
    creep.memory.resources = carriedResources.map(res => {
      // Try to find existing target for this resource type
      const existing = creep.memory.resources.find(r => r.resourceType === res.resourceType);
      return {
        resourceType: res.resourceType,
        amount: res.amount,
        target: existing ? existing.target : null
      };
    });
  }
  
  // Check if there's a delivery order for any resource
  // For backward compatibility: if using old format, check with resourceType
  if (creep.memory.resourceType && !creep.memory.resources) {
    // Old format - use single resource type
    const order = rc.getDeliveryOrder(creep, creep.memory.resourceType);
    if (order !== null && order !== undefined) {
      return true;
    }
  } else {
    // New format - check all resources
    const orders = rc.getDeliveryOrder(creep, null);
    if (orders && (Array.isArray(orders) ? orders.length > 0 : orders !== null)) {
      return true;
    }
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
  
  // Migrate old memory format if needed
  migrateMemoryFormat(creep);
  
  // Get all resources the creep is carrying
  const carriedResources = getCarriedResources(creep);
  if (carriedResources.length === 0) {
    // No resources - should not happen if when() worked correctly
    return;
  }
  
  // Get all delivery orders for all carried resources
  // For backward compatibility: if using old format, use old API
  let allOrders;
  if (creep.memory.resourceType && !creep.memory.resources) {
    // Old format - use single resource type
    allOrders = rc.getDeliveryOrder(creep, creep.memory.resourceType);
  } else {
    // New format - get all orders
    allOrders = rc.getDeliveryOrder(creep, null);
  }
  const ordersArray = Array.isArray(allOrders) ? allOrders : (allOrders ? [allOrders] : []);
  
  // Group orders by target to enable batch delivery
  const ordersByTarget = {};
  for (const order of ordersArray) {
    if (!order || !order.id) continue;
    if (!ordersByTarget[order.id]) {
      ordersByTarget[order.id] = [];
    }
    ordersByTarget[order.id].push(order);
  }
  
  const currentTarget = creep.getTarget();
  const currentTargetId = currentTarget ? currentTarget.id : null;
  
  // Find best target (highest priority first)
  let bestTarget = null;
  let bestTargetOrders = null;
  let bestPriority = Infinity;
  
  // Check if creep already has a target and if it's still valid
  // currentTarget and currentTargetId already declared above
  if (currentTarget && ordersByTarget[currentTarget.id]) {
    // Current target is still valid - keep it to prevent switching every tick
    bestTarget = currentTarget;
    bestTargetOrders = ordersByTarget[currentTarget.id];
    bestPriority = Math.min(...bestTargetOrders.map(o => o.priority));
    
    // Verify target is still valid (has free capacity and needs resources)
    let targetStillValid = false;
    for (const order of bestTargetOrders) {
      // @ts-ignore - Game.getObjectById can return various types
      const targetObj = Game.getObjectById(order.id);
      if (targetObj) {
        // @ts-ignore - targetObj may have store property
        if (targetObj.store) {
          // @ts-ignore - store property exists on structures/creeps
          const freeCapacity = targetObj.store.getFreeCapacity(order.resourceType) || 0;
          const hasResource = creep.store[order.resourceType] > 0;
          if (freeCapacity > 0 && hasResource) {
            targetStillValid = true;
            break;
          }
        } else {
          // No store (e.g., controller) - assume still valid
          targetStillValid = true;
          break;
        }
      }
    }
    
    // If current target is no longer valid, find a new one
    if (!targetStillValid) {
      bestTarget = null;
      bestTargetOrders = null;
      bestPriority = Infinity;
    } else {
      // Current target is still valid - keep it and skip searching for new target
      // This prevents switching every tick when priorities are similar
    }
  }
  
  // If no valid current target, find best target from available orders
  if (!bestTarget) {
    // First, check if current target is in the orders but was filtered out
    // This can happen if the target is full or conditions changed, but we should still try to keep it
    if (currentTargetId) {
      // Check if current target exists and still needs resources
      // @ts-ignore - Game.getObjectById can return various types
      const currentTargetObj = Game.getObjectById(currentTargetId);
      if (currentTargetObj) {
        // Check if it still needs the resource we're carrying
        for (const resource of carriedResources) {
          // @ts-ignore - currentTargetObj may have store property
          if (currentTargetObj.store) {
            // @ts-ignore - store property exists on structures/creeps
            const freeCapacity = currentTargetObj.store.getFreeCapacity(resource.resourceType) || 0;
            if (freeCapacity > 0 && creep.store[resource.resourceType] > 0) {
              // Target still needs this resource - try to keep it
              // Create a pseudo-order for the current target
              const pseudoOrder = {
                id: currentTargetId,
                resourceType: resource.resourceType,
                priority: 20, // Default priority
                amount: freeCapacity,
                exact: false
              };
              if (!ordersByTarget[currentTargetId]) {
                ordersByTarget[currentTargetId] = [];
              }
              ordersByTarget[currentTargetId].push(pseudoOrder);
              bestTarget = currentTargetObj;
              bestTargetOrders = ordersByTarget[currentTargetId];
              bestPriority = 20;
              break;
            }
          }
        }
      }
    }
    
    // If still no target, find best from available orders
    if (!bestTarget) {
      for (const targetId in ordersByTarget) {
        const targetOrders = ordersByTarget[targetId];
        const minPriority = Math.min(...targetOrders.map(o => o.priority));
        if (minPriority < bestPriority) {
          bestPriority = minPriority;
          // @ts-ignore - Game.getObjectById can return various types
          bestTarget = Game.getObjectById(targetId);
          bestTargetOrders = targetOrders;
        }
      }
    }
  }
  
  // If no target found, try fallback logic
  if (!bestTarget) {
    // Try to find matching need for any resource the creep has
    const needsResources = rc.needsResources();
    if (needsResources && needsResources.length > 0) {
      // Find best matching need
      let bestNeed = null;
      let bestNeedPriority = Infinity;
      
      for (const resource of carriedResources) {
        const matchingNeeds = needsResources.filter(need => 
          need.resourceType === resource.resourceType && 
          need.amount > 0
        );
        
        for (const need of matchingNeeds) {
          // Check assignment count
          const assignedCount = rc.getAssignedTransporters(need.id, need.resourceType);
          const targetObj = Game.getObjectById(need.id);
          if (!targetObj) continue;
          
          const freeCapacity = targetObj.store ? targetObj.store.getFreeCapacity(need.resourceType) || 0 : 0;
          if (freeCapacity <= 0) continue;
          
          // Check if this is a special case
          const isSpecialCase = need.id === creep.room.controller.memory.containerID;
          const hasOtherTransporters = rc.getCreeps(null, need.id).length > 0;
          
          if (hasOtherTransporters && !isSpecialCase) {
            continue;
          }
          
          if (need.priority < bestNeedPriority) {
            bestNeedPriority = need.priority;
            bestNeed = need;
            bestTarget = targetObj;
          }
        }
      }
      
      if (bestNeed && bestTarget) {
        // Update memory with this resource-target pair
        if (!creep.memory.resources) {
          creep.memory.resources = [];
        }
        const resourceEntry = creep.memory.resources.find(r => r.resourceType === bestNeed.resourceType);
        if (resourceEntry) {
          resourceEntry.target = bestTarget.id;
        } else {
          creep.memory.resources.push({
            resourceType: bestNeed.resourceType,
            amount: creep.store[bestNeed.resourceType] || 0,
            target: bestTarget.id
          });
        }
        creep.target = bestTarget.id;
        bestTargetOrders = [bestNeed];
        Log.debug(`${creep} found matching need for ${bestNeed.resourceType} to ${bestTarget}`, "transfer_resources");
      }
    }
    
    // If still no target, try terminal as fallback
    if (!bestTarget) {
      const terminal = creep.room.terminal;
      if (terminal && terminal.my) {
        // Find first resource that terminal can accept
        for (const resource of carriedResources) {
          const freeCapacity = terminal.store.getFreeCapacity(resource.resourceType);
          if (freeCapacity > 0) {
            bestTarget = terminal;
            creep.target = terminal.id;
            // Create a pseudo-order for terminal
            bestTargetOrders = [{
              resourceType: resource.resourceType,
              id: terminal.id,
              amount: Math.min(resource.amount, freeCapacity),
              exact: false
            }];
            Log.info(`${creep} has resources (${resource.resourceType}) but no delivery order found. Delivering to terminal.`, "transfer_resources");
            break;
          }
        }
        
        // If terminal is full for all resources, drop them
        if (!bestTarget) {
          Log.warn(`${creep} has resources but no delivery target found and terminal is full. Dropping resources.`, "transfer_resources");
          for (const resource of carriedResources) {
            creep.drop(resource.resourceType);
          }
          creep.memory.resources = [];
          return;
        }
      } else {
        // No terminal - drop resources
        Log.warn(`${creep} has resources but no delivery target found and no terminal. Dropping resources.`, "transfer_resources");
        for (const resource of carriedResources) {
          creep.drop(resource.resourceType);
        }
        creep.memory.resources = [];
        return;
      }
    }
  }
  
  // Update creep target if needed
  if (bestTarget && creep.target !== bestTarget.id) {
    creep.target = bestTarget.id;
  }
  
  // Perform batch delivery: transfer all matching resources to the same target
  if (bestTarget && bestTargetOrders && bestTargetOrders.length > 0) {
    let transferredAny = false;
    
    // Sort orders by priority (highest first)
    bestTargetOrders.sort((a, b) => a.priority - b.priority);
    
    // Transfer each resource type that matches the target
    for (const order of bestTargetOrders) {
      const resourceType = order.resourceType;
      const amount = creep.store[resourceType] || 0;
      
      if (amount <= 0) continue;
      
      // Check if target can still accept this resource
      // @ts-ignore - Game.getObjectById can return various types
      const targetObj = Game.getObjectById(order.id);
      if (!targetObj) continue;
      
      let transferAmount = amount;
      if (order.exact === true) {
        transferAmount = Math.min(order.amount, amount);
      } else {
        // @ts-ignore - targetObj may have store property
        if (targetObj.store) {
          // @ts-ignore - store property exists on structures/creeps
          const freeCapacity = targetObj.store.getFreeCapacity(resourceType) || 0;
          transferAmount = Math.min(amount, freeCapacity);
        }
      }
      
      if (transferAmount <= 0) continue;
      
      let result;
      if (order.exact === true) {
        result = creep.transfer(bestTarget, resourceType, transferAmount);
      } else {
        result = creep.transfer(bestTarget, resourceType);
      }
      
      switch (result) {
        case OK:
          Log.info(`${creep} successfully transfers ${resourceType} (${transferAmount}) to ${bestTarget}`, "transfer_resources");
          transferredAny = true;
          
          // Update memory: remove or reduce resource entry
          if (creep.memory.resources && Array.isArray(creep.memory.resources)) {
            const resourceEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
            if (resourceEntry) {
              resourceEntry.amount = Math.max(0, resourceEntry.amount - transferAmount);
              if (resourceEntry.amount <= 0) {
                // Remove entry if empty
                creep.memory.resources = creep.memory.resources.filter(r => r.resourceType !== resourceType);
              }
            }
          } else if (creep.memory.resourceType === resourceType) {
            // Old format - update amount
            creep.memory.amount = Math.max(0, (creep.memory.amount || 0) - transferAmount);
            if (creep.memory.amount <= 0) {
              creep.memory.resourceType = null;
              creep.memory.amount = 0;
            }
          }
          
          // Clear target if all resources delivered
          if (creep.store.getUsedCapacity() === 0) {
            creep.target = null;
            creep.exact = false;
            creep.amount = 0;
          }
          break;
          
        case ERR_NOT_ENOUGH_RESOURCES:
          Log.warn(`${creep} had not enough resources for ${resourceType}. Why is this happening?`, "transfer_resources");
          creep.target = null;
          creep.exact = false;
          creep.amount = 0;
          break;
          
        case ERR_FULL:
          Log.info(`${creep} ${bestTarget} is full for ${resourceType}`, "transfer_resources");
          // Try next resource type or clear target
          creep.target = null;
          break;
          
        case ERR_NOT_IN_RANGE:
          // Move towards target (only once, not for each resource)
          if (!transferredAny) {
            creep.travelTo(bestTarget, {
              maxRooms: 0
            });
          }
          return; // Stop processing other resources, move first
          
        default:
          Log.warn(`${creep} has unknown result from transfer ${resourceType} to (${bestTarget}): ${result}`, "transfer_resources");
      }
    }
    
    // If we transferred something and are in range, continue to next tick
    // If we're not in range, travelTo was called and we return
  } else if (creep.memory.resourceType && !creep.memory.resources) {
    // Fallback: Old format - try to use old logic
    const oldOrder = rc.getDeliveryOrder(creep, creep.memory.resourceType);
    if (oldOrder && oldOrder.id) {
      // @ts-ignore - Game.getObjectById can return various types
      const oldTarget = Game.getObjectById(oldOrder.id);
      if (oldTarget) {
        const resourceType = creep.memory.resourceType;
        const amount = creep.store[resourceType] || 0;
        
        if (amount > 0) {
          let result;
          if (oldOrder.exact === true) {
            result = creep.transfer(oldTarget, resourceType, Math.min(oldOrder.amount, amount));
          } else {
            result = creep.transfer(oldTarget, resourceType);
          }
          
          switch (result) {
            case OK:
              Log.info(`${creep} successfully transfers ${resourceType} to ${oldTarget}`, "transfer_resources");
              creep.target = null;
              creep.exact = false;
              creep.amount = 0;
              if (creep.store.getUsedCapacity() === 0) {
                creep.memory.resourceType = null;
              }
              break;
            case ERR_NOT_IN_RANGE:
              creep.travelTo(oldTarget, { maxRooms: 0 });
              break;
            case ERR_FULL:
              Log.info(`${creep} ${oldTarget} is full`, "transfer_resources");
              creep.target = null;
              break;
            default:
              Log.warn(`${creep} transfer error: ${result}`, "transfer_resources");
          }
        }
      }
    }
  }
};
module.exports = b;