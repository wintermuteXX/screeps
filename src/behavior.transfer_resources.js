const Behavior = require("_behavior");
const Log = require("Log");
const b = new Behavior("transfer_resources");

/**
 * Helper: Converts old memory format (resourceType) to new format (resources array)
 */
b._migrateMemoryFormat = function (creep) {
  if (creep.memory.resourceType && !creep.memory.resources) {
    const resourceType = creep.memory.resourceType;
    const amount = creep.store[resourceType] || 0;
    if (amount > 0) {
      creep.memory.resources = [{
        resourceType: resourceType,
        amount: amount,
        target: creep.target || null
      }];
    }
  }
  
  if (!creep.memory.resources) {
    creep.memory.resources = [];
  }
};

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
 * Helper: Gets delivery orders for creep (handles old and new format)
 */
b._getDeliveryOrders = function (creep, rc) {
  if (creep.memory.resourceType && !creep.memory.resources) {
    // Old format
    const order = rc.getDeliveryOrder(creep, creep.memory.resourceType);
    return order ? [order] : [];
  } else {
    // New format
    const orders = rc.getDeliveryOrder(creep, null);
    return Array.isArray(orders) ? orders : (orders ? [orders] : []);
  }
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
    
    // @ts-ignore - targetObj may have store property
    if (targetObj.store) {
      // @ts-ignore - store property exists on structures/creeps
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
  
  // First, try to keep current target if it's still valid
  if (currentTargetId && ordersByTarget[currentTargetId]) {
    const currentTargetObj = Game.getObjectById(currentTargetId);
    if (currentTargetObj) {
      // Check if it still needs resources
      for (const resource of carriedResources) {
        // @ts-ignore - currentTargetObj may have store property
        if (currentTargetObj.store) {
          // @ts-ignore - store property exists on structures/creeps
          const freeCapacity = currentTargetObj.store.getFreeCapacity(resource.resourceType) || 0;
          if (freeCapacity > 0) {
            // Create pseudo-order for current target
            const pseudoOrder = {
              id: currentTargetId,
              resourceType: resource.resourceType,
              priority: 20,
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
  
  // Find best target from available orders
  if (!bestTarget) {
    for (const targetId in ordersByTarget) {
      const targetOrders = ordersByTarget[targetId];
      const minPriority = Math.min(...targetOrders.map(o => o.priority));
      if (minPriority < bestPriority) {
        bestPriority = minPriority;
        bestTarget = Game.getObjectById(targetId);
        bestTargetOrders = targetOrders;
      }
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
      
      // @ts-ignore - targetObj may have store property
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
  if (creep.memory.resources && Array.isArray(creep.memory.resources)) {
    const resourceEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
    if (resourceEntry) {
      resourceEntry.amount = Math.max(0, resourceEntry.amount - transferAmount);
      if (resourceEntry.amount <= 0) {
        creep.memory.resources = creep.memory.resources.filter(r => r.resourceType !== resourceType);
      }
    }
  } else if (creep.memory.resourceType === resourceType) {
    // Old format
    creep.memory.amount = Math.max(0, (creep.memory.amount || 0) - transferAmount);
    if (creep.memory.amount <= 0) {
      creep.memory.resourceType = null;
      creep.memory.amount = 0;
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
      Log.warn(`${creep} has unknown result from transfer ${resourceType} to ${target}: ${result}`, "transfer_resources");
      return false;
  }
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
        creep.travelTo(target, { maxRooms: 0 });
      }
      return; // Stop processing, move first
    }
    
    if (transferResult === true) {
      transferredAny = true;
    }
  }
};

/**
 * Helper: Handles old format fallback
 */
b._handleOldFormatFallback = function (creep, rc) {
  if (!creep.memory.resourceType || creep.memory.resources) {
    return;
  }
  
  const oldOrder = rc.getDeliveryOrder(creep, creep.memory.resourceType);
  if (!oldOrder || !oldOrder.id) {
    return;
  }
  
  const oldTarget = Game.getObjectById(oldOrder.id);
  if (!oldTarget) {
    return;
  }
  
  const resourceType = creep.memory.resourceType;
  const amount = creep.store[resourceType] || 0;
  
  if (amount <= 0) {
    return;
  }
  
  const transferAmount = oldOrder.exact === true
    ? Math.min(oldOrder.amount, amount)
    : amount;
  
  const result = oldOrder.exact === true
    ? creep.transfer(oldTarget, resourceType, transferAmount)
    : creep.transfer(oldTarget, resourceType);
  
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
};

/**
 * When: Behavior is active if creep has resources
 */
b.when = function (creep, rc) {
  if (creep.store.getUsedCapacity() === 0) {
    return false;
  }
  
  this._migrateMemoryFormat(creep);
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
  this._migrateMemoryFormat(creep);
  
  const carriedResources = this._getCarriedResources(creep);
  if (carriedResources.length === 0) {
    return;
  }
  
  // Get delivery orders
  const allOrders = this._getDeliveryOrders(creep, rc);
  const ordersByTarget = this._groupOrdersByTarget(allOrders);
  
  const currentTarget = creep.getTarget();
  const currentTargetId = currentTarget ? currentTarget.id : null;
  
  // Check if current target is still valid
  let bestTarget = null;
  let bestTargetOrders = null;
  
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
  
  // Update creep target if needed
  if (bestTarget && creep.target !== bestTarget.id) {
    creep.target = bestTarget.id;
  }
  
  // Perform batch delivery
  if (bestTarget && bestTargetOrders && bestTargetOrders.length > 0) {
    this._performBatchDelivery(creep, bestTarget, bestTargetOrders);
  } else {
    // Fallback: old format
    this._handleOldFormatFallback(creep, rc);
  }
};

module.exports = b;
