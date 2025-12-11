const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const CONSTANTS = require("./config.constants");
const b = new Behavior("transfer_resources");

/**
 * Helper: Gets all resource types currently in creep's store
 */
b._getCarriedResources = function (creep) {
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
};

/**
 * Helper: Updates memory with current store contents, preserving existing targets
 */
b._updateMemoryWithCarriedResources = function (creep) {
  const carriedResources = this._getCarriedResources(creep);
  if (!creep.memory.resources) {
    creep.memory.resources = [];
  }
  
  if (carriedResources.length > 0) {
    creep.memory.resources = carriedResources.map(res => {
      const existing = creep.memory.resources.find(r => r.resourceType === res.resourceType);
      return {
        resourceType: res.resourceType,
        amount: res.amount,
        target: existing ? existing.target : null
      };
    });
  }
};

/**
 * Helper: Gets delivery orders for creep
 */
b._getDeliveryOrders = function (creep, rc) {
  const orders = rc.getDeliveryOrder(creep, null);
  return Array.isArray(orders) ? orders : (orders ? [orders] : []);
};

/**
 * Helper: Groups orders by target ID
 */
b._groupOrdersByTarget = function (orders) {
  const ordersByTarget = {};
  for (const order of orders) {
    if (!order || !order.id) continue;
    if (!ordersByTarget[order.id]) {
      ordersByTarget[order.id] = [];
    }
    ordersByTarget[order.id].push(order);
  }
  return ordersByTarget;
};

/**
 * Helper: Checks if target is still valid (has free capacity and needs resources)
 */
b._isTargetValid = function (target, orders, creep) {
  for (const order of orders) {
    const targetObj = Game.getObjectById(order.id);
    if (!targetObj) continue;
    
    if (targetObj.store) {
      const freeCapacity = targetObj.store.getFreeCapacity(order.resourceType) || 0;
      const hasResource = creep.store[order.resourceType] > 0;
      if (freeCapacity > 0 && hasResource) {
        return true;
      }
    } else {
      // No store (e.g., controller) - assume still valid
      return true;
    }
  }
  return false;
};

/**
 * Helper: Finds best target from available orders
 */
b._findBestTargetFromOrders = function (ordersByTarget, carriedResources, currentTargetId) {
  let bestTarget = null;
  let bestTargetOrders = null;
  let bestPriority = Infinity;
  
  // Find best target from available orders
  for (const targetId in ordersByTarget) {
    const targetOrders = ordersByTarget[targetId];
    const minPriority = Math.min(...targetOrders.map(o => o.priority));
    
    // Prefer current target if priorities are similar
    if (targetId === currentTargetId && minPriority < bestPriority + 5) {
      bestPriority = minPriority;
      bestTarget = Game.getObjectById(targetId);
      bestTargetOrders = targetOrders;
    } else if (minPriority < bestPriority) {
      bestPriority = minPriority;
      bestTarget = Game.getObjectById(targetId);
      bestTargetOrders = targetOrders;
    }
  }
  
  return { bestTarget, bestTargetOrders };
};

/**
 * Helper: Finds matching need from needsResources as fallback
 */
b._findMatchingNeed = function (creep, rc, carriedResources) {
  const needsResources = rc.needsResources();
  if (!needsResources || needsResources.length === 0) {
    return null;
  }
  
  let bestNeed = null;
  let bestTarget = null;
  let bestNeedPriority = Infinity;
  
  for (const resource of carriedResources) {
    const matchingNeeds = needsResources.filter(need => 
      need.resourceType === resource.resourceType && need.amount > 0
    );
    
    for (const need of matchingNeeds) {
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
    
    let resourceEntry = creep.memory.resources.find(r => r.resourceType === bestNeed.resourceType);
    if (resourceEntry) {
      resourceEntry.target = bestTarget.id;
      resourceEntry.amount = creep.store[bestNeed.resourceType] || 0;
    } else {
      creep.memory.resources.push({
        resourceType: bestNeed.resourceType,
        amount: creep.store[bestNeed.resourceType] || 0,
        target: bestTarget.id
      });
    }
    
    creep.target = bestTarget.id;
    Log.debug(`${creep} found matching need for ${bestNeed.resourceType} to ${bestTarget}`, "transfer_resources");
    return { target: bestTarget, orders: [bestNeed] };
  }
  
  return null;
};

/**
 * Helper: Tries terminal as fallback target
 */
b._findTerminalFallback = function (creep, carriedResources) {
  const terminal = creep.room.terminal;
  if (!terminal || !terminal.my) {
    return null;
  }
  
  for (const resource of carriedResources) {
    const freeCapacity = terminal.store.getFreeCapacity(resource.resourceType);
    if (freeCapacity > 0) {
      creep.target = terminal.id;
      const pseudoOrder = {
        resourceType: resource.resourceType,
        id: terminal.id,
        amount: Math.min(resource.amount, freeCapacity),
        exact: false
      };
      Log.info(
        `${creep} has resources (${resource.resourceType}) but no delivery order found. Delivering to terminal.`,
        "transfer_resources"
      );
      return { target: terminal, orders: [pseudoOrder] };
    }
  }
  
  return null;
};

/**
 * Helper: Drops all resources as last resort
 */
b._dropAllResources = function (creep, carriedResources, reason) {
  Log.warn(`${creep} ${reason}. Dropping resources.`, "transfer_resources");
  for (const resource of carriedResources) {
    creep.drop(resource.resourceType);
  }
  creep.memory.resources = [];
};

/**
 * Helper: Updates memory after successful transfer
 */
b._updateMemoryAfterTransfer = function (creep, resourceType, transferAmount) {
  if (!creep.memory.resources || !Array.isArray(creep.memory.resources)) {
    return;
  }
  
  const resourceEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
  if (resourceEntry) {
    resourceEntry.amount = Math.max(0, resourceEntry.amount - transferAmount);
    if (resourceEntry.amount <= 0) {
      creep.memory.resources = creep.memory.resources.filter(r => r.resourceType !== resourceType);
    }
  }
};

/**
 * Helper: Calculates transfer amount based on order and target capacity
 */
b._calculateTransferAmount = function (order, targetObj, creep) {
  const amount = creep.store[order.resourceType] || 0;
  
  if (order.exact === true) {
    return Math.min(order.amount, amount);
  }
  
  if (targetObj.store) {
    const freeCapacity = targetObj.store.getFreeCapacity(order.resourceType) || 0;
    return Math.min(amount, freeCapacity);
  }
  
  return amount;
};

/**
 * Helper: Handles transfer result
 */
b._handleTransferResult = function (creep, target, resourceType, transferAmount, result) {
  switch (result) {
    case OK:
      Log.info(`${creep} successfully transfers ${resourceType} (${transferAmount}) to ${target}`, "transfer_resources");
      this._updateMemoryAfterTransfer(creep, resourceType, transferAmount);
      
      if (creep.store.getUsedCapacity() === 0) {
        creep.target = null;
        creep.exact = false;
        creep.amount = 0;
      }
      return true;
      
    case ERR_NOT_ENOUGH_RESOURCES:
      Log.warn(`${creep} had not enough resources for ${resourceType}. Why is this happening?`, "transfer_resources");
      creep.target = null;
      creep.exact = false;
      creep.amount = 0;
      return false;
      
    case ERR_FULL:
      Log.info(`${creep} ${target} is full for ${resourceType}`, "transfer_resources");
      creep.target = null;
      return false;
      
    case ERR_NOT_IN_RANGE:
      return null; // Signal to move
      
    default:
      Log.warn(`${creep} has unknown result from transfer ${resourceType} to ${target}: ${global.getErrorString(result)}`, "transfer_resources");
      return false;
  }
};

/**
 * Helper: Validates current target without fetching new orders
 * Returns true if target is still valid (exists, has capacity, needs resources)
 */
b._validateCurrentTarget = function (creep, target, carriedResources) {
  if (!target) return false;
  
  // Check if target still exists
  const targetObj = Game.getObjectById(target.id);
  if (!targetObj) return false;
  
  // Check if creep has resources that target needs
  let hasMatchingResource = false;
  for (const resource of carriedResources) {
    if (targetObj.store) {
      const freeCapacity = targetObj.store.getFreeCapacity(resource.resourceType) || 0;
      if (freeCapacity > 0) {
        hasMatchingResource = true;
        break;
      }
    } else {
      // No store (e.g., controller) - assume valid if we have energy
      if (resource.resourceType === RESOURCE_ENERGY) {
        hasMatchingResource = true;
        break;
      }
    }
  }
  
  return hasMatchingResource;
};

/**
 * Helper: Creates pseudo-orders from memory for current target
 * Used when we keep the current target without calling getDeliveryOrder
 */
b._createOrdersFromMemory = function (creep, target, carriedResources) {
  const orders = [];
  
  for (const resource of carriedResources) {
    const freeCapacity = target.store 
      ? target.store.getFreeCapacity(resource.resourceType) || 0 
      : Infinity;
    
    if (freeCapacity > 0) {
      // Check if memory has this resource with this target (for priority)
      const memoryEntry = creep.memory.resources.find(
        r => r.resourceType === resource.resourceType && r.target === target.id
      );
      
      orders.push({
        resourceType: resource.resourceType,
        id: target.id,
        amount: Math.min(resource.amount, freeCapacity),
        priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_MID, // Default priority
        exact: false
      });
    }
  }
  
  return orders;
};

/**
 * Helper: Performs batch delivery to target
 */
b._performBatchDelivery = function (creep, target, orders) {
  orders.sort((a, b) => a.priority - b.priority);
  
  let transferredAny = false;
  
  for (const order of orders) {
    const resourceType = order.resourceType;
    const amount = creep.store[resourceType] || 0;
    
    if (amount <= 0) continue;
    
    const targetObj = Game.getObjectById(order.id);
    if (!targetObj) continue;
    
    const transferAmount = this._calculateTransferAmount(order, targetObj, creep);
    if (transferAmount <= 0) continue;
    
    const result = order.exact === true
      ? creep.transfer(target, resourceType, transferAmount)
      : creep.transfer(target, resourceType);
    
    const transferResult = this._handleTransferResult(creep, target, resourceType, transferAmount, result);
    
    if (transferResult === null) {
      // Need to move
      if (!transferredAny) {
        creep.travelTo(target, { maxRooms: 0});
      }
      return; // Stop processing, move first
    }
     
    if (transferResult === true) {
      transferredAny = true;
    }
  }
};

/**
 * When: Behavior is active if creep has resources
 */
b.when = function (creep, rc) {
  if (creep.store.getUsedCapacity() === 0) {
    return false;
  }
  
  // Ensure memory.resources exists
  if (!creep.memory.resources) {
    creep.memory.resources = [];
  }
  this._updateMemoryWithCarriedResources(creep);
  
  // Check if there's a delivery order
  const orders = this._getDeliveryOrders(creep, rc);
  if (orders.length > 0) {
    return true;
  }
  
  // No order assigned, but creep has resources - keep behavior active
  return true;
};

/**
 * Completed: Behavior is completed when creep has no resources left
 */
b.completed = function (creep, rc) {
  return creep.store.getUsedCapacity() === 0;
};

/**
 * Work: Main logic for transferring resources to targets
 */
b.work = function (creep, rc) {
  // Ensure memory.resources exists
  if (!creep.memory.resources) {
    creep.memory.resources = [];
  }
  
  const carriedResources = this._getCarriedResources(creep);
  if (carriedResources.length === 0) {
    return;
  }
  
  const currentTarget = creep.getTarget();
  const currentTargetId = currentTarget ? currentTarget.id : null;
  
  // Check if current target is still valid (without calling getDeliveryOrder)
  let bestTarget = null;
  let bestTargetOrders = null;
  
  if (currentTarget) {
    // Validate current target without fetching new orders
    const isValid = this._validateCurrentTarget(creep, currentTarget, carriedResources);
    if (isValid) {
      // Current target is still valid - use it without calling getDeliveryOrder
      bestTarget = currentTarget;
      // Create pseudo-orders from memory for current target
      bestTargetOrders = this._createOrdersFromMemory(creep, currentTarget, carriedResources);
    }
  }
  
  // Only call getDeliveryOrder if no valid target exists
  if (!bestTarget) {
    // Get delivery orders
    const allOrders = this._getDeliveryOrders(creep, rc);
    const ordersByTarget = this._groupOrdersByTarget(allOrders);
    
    // Check if current target is in new orders (if it still exists)
    if (currentTarget && ordersByTarget[currentTarget.id]) {
      const currentOrders = ordersByTarget[currentTarget.id];
      if (this._isTargetValid(currentTarget, currentOrders, creep)) {
        bestTarget = currentTarget;
        bestTargetOrders = currentOrders;
      }
    }
    
    // Find best target from orders
    if (!bestTarget) {
      const result = this._findBestTargetFromOrders(ordersByTarget, carriedResources, currentTargetId);
      bestTarget = result.bestTarget;
      bestTargetOrders = result.bestTargetOrders;
    }
    
    // Try fallback: matching need
    if (!bestTarget) {
      const fallback = this._findMatchingNeed(creep, rc, carriedResources);
      if (fallback) {
        bestTarget = fallback.target;
        bestTargetOrders = fallback.orders;
      }
    }
    
    // Try fallback: terminal
    if (!bestTarget) {
      const terminalFallback = this._findTerminalFallback(creep, carriedResources);
      if (terminalFallback) {
        bestTarget = terminalFallback.target;
        bestTargetOrders = terminalFallback.orders;
      } else {
        // Last resort: drop resources
        this._dropAllResources(
          creep,
          carriedResources,
          "has resources but no delivery target found and terminal is full or missing"
        );
        return;
      }
    }
  }
  
  // Update creep target if needed
  if (bestTarget && creep.target !== bestTarget.id) {
    creep.target = bestTarget.id;
  }
  
  // Perform batch delivery
  if (bestTarget && bestTargetOrders && bestTargetOrders.length > 0) {
    this._performBatchDelivery(creep, bestTarget, bestTargetOrders);
  } 
};

module.exports = b;
