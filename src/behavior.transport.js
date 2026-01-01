const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const b = new Behavior("transport");

/**
 * When: Behavior is active if creep has transport orders or needs new ones
 */
b.when = function (creep, rc) {
  // Check if creep has transport orders
  if (!creep.memory.transport || !Array.isArray(creep.memory.transport)) {
    // No transport memory - behavior should be active to request new orders
    return true;
  }

  // Active if there are orders OR if we need to request new ones (empty creep)
  return creep.memory.transport.length > 0 || creep.store.getUsedCapacity() === 0;
};

/**
 * Completed: Behavior is completed when all transport orders are done
 */
b.completed = function (creep, rc) {
  if (!creep.memory.transport || !Array.isArray(creep.memory.transport)) {
    return true;
  }

  // Check if all orders are done (array is empty)
  return creep.memory.transport.length === 0;
};

/**
 * Work: Main logic for processing transport orders
 */
b.work = function (creep, rc) {
  // Initialize transport memory if it doesn't exist
  if (!creep.memory.transport || !Array.isArray(creep.memory.transport)) {
    creep.memory.transport = [];
  }

  // Get current active order (first order in array)
  if (creep.memory.transport.length === 0) {
    // No active orders - try to get new ones
    const newOrders = rc.getTransportOrderOrnithopter(creep);
    if (!newOrders || newOrders.length === 0) {
      // No new orders available
      return;
    }
    // Orders are already stored in creep.memory.transport by getTransportOrderOrnithopter
    // Continue processing in same tick if possible
  }

  const currentOrder = creep.memory.transport[0];
  if (!currentOrder) {
    return;
  }

  // Get target object
  const target = Game.getObjectById(currentOrder.id);
  if (!target) {
    // Target no longer exists - remove order from memory
    Log.warn(`${creep} target ${currentOrder.id} no longer exists, removing order`, "transport");
    creep.memory.transport.shift();
    return;
  }

  // Set creep target for movement
  creep.target = currentOrder.id;

  // Check if we're in range
  if (!creep.pos.inRangeTo(target, 1)) {
    // Move to target
    creep.travelTo(target);
    return;
  }

  // We're at the target - execute action
  const resourceType = currentOrder.resourceType;
  const amount = currentOrder.amount || 0;
  let result;

  if (currentOrder.type === "give") {
    // Withdraw/pick up resources from target
    if (!target.store || target.store.getUsedCapacity(resourceType) === 0) {
      // Target has no resources - remove order
      Log.warn(`${creep} target ${target} has no ${resourceType}, removing order`, "transport");
      creep.memory.transport.shift();
      creep.target = null;
      return;
    }

    const withdrawAmount = Math.min(
      amount,
      target.store.getUsedCapacity(resourceType),
      creep.store.getFreeCapacity(resourceType)
    );

    if (withdrawAmount > 0) {
      result = creep.withdraw(target, resourceType, withdrawAmount);
      
      switch (result) {
        case OK:
          // Remove completed order from memory
          creep.memory.transport.shift();
          creep.target = null;
          break;
        case ERR_NOT_ENOUGH_RESOURCES:
          Log.warn(`${creep} not enough ${resourceType} in ${target}, removing order`, "transport");
          creep.memory.transport.shift();
          creep.target = null;
          break;
        case ERR_FULL:
          Log.warn(`${creep} store full, cannot withdraw`, "transport");
          // Don't remove order, try again next tick
          break;
        default:
          Log.warn(`${creep} withdraw error: ${global.getErrorString(result)}`, "transport");
          // Remove order on error to prevent infinite loop
          creep.memory.transport.shift();
          creep.target = null;
      }
    } else {
      // No capacity or resources - remove order
      creep.memory.transport.shift();
      creep.target = null;
    }

  } else if (currentOrder.type === "need") {
    // Transfer/deliver resources to target
    if (creep.store.getUsedCapacity(resourceType) === 0) {
      // Creep has no resources - this shouldn't happen if orders are correct
      Log.warn(`${creep} has no ${resourceType} for order, removing order`, "transport");
      creep.memory.transport.shift();
      creep.target = null;
      return;
    }

    if (!target.store || target.store.getFreeCapacity(resourceType) === 0) {
      // Target has no capacity - remove order
      Log.warn(`${creep} target ${target} has no capacity for ${resourceType}, removing order`, "transport");
      creep.memory.transport.shift();
      creep.target = null;
      return;
    }

    const transferAmount = Math.min(
      amount,
      creep.store.getUsedCapacity(resourceType),
      target.store.getFreeCapacity(resourceType)
    );

    if (transferAmount > 0) {
      result = creep.transfer(target, resourceType, transferAmount);
      
      switch (result) {
        case OK:
          // Remove completed order from memory
          creep.memory.transport.shift();
          creep.target = null;
          break;
        case ERR_NOT_ENOUGH_RESOURCES:
          Log.warn(`${creep} not enough ${resourceType}, removing order`, "transport");
          creep.memory.transport.shift();
          creep.target = null;
          break;
        case ERR_FULL:
          Log.warn(`${creep} target ${target} is full, removing order`, "transport");
          creep.memory.transport.shift();
          creep.target = null;
          break;
        default:
          Log.warn(`${creep} transfer error: ${global.getErrorString(result)}`, "transport");
          // Remove order on error to prevent infinite loop
          creep.memory.transport.shift();
          creep.target = null;
      }
    } else {
      // No resources or capacity - remove order
      creep.memory.transport.shift();
      creep.target = null;
    }
  }
};

module.exports = b;
