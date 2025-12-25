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
    console.log(`${creep.name} newOrders: ${JSON.stringify(newOrders, null, 2)}`);
    if (!newOrders || newOrders.length === 0) {
      // No new orders available
      return;
    }
    // New orders assigned, continue with first one in next tick
    return;
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
    creep.memory.transport.shift(); // Remove first order
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

  // We're at the target - simulate action
  if (currentOrder.type === "give") {
    // Simulate withdrawing/picking up
    const resourceType = currentOrder.resourceType;
    const amount = currentOrder.amount || 0;
    const targetName = target.structureType || target.constructor.name || "Object";
    
    console.log(
      `SIMULIERT: ${creep} nimmt ${amount} ${resourceType} von ${targetName} (${target.id})`,
      "transport"
    );
    
    // Remove completed order from memory
    creep.memory.transport.shift();
    
  } else if (currentOrder.type === "need") {
    // Simulate transferring/delivering
    const resourceType = currentOrder.resourceType;
    const amount = currentOrder.amount || 0;
    const targetName = target.structureType || target.constructor.name || "Object";
    
    console.log(
      `SIMULIERT: ${creep} liefert ${amount} ${resourceType} an ${targetName} (${target.id})`,
      "transport"
    );
    
    // Remove completed order from memory
    creep.memory.transport.shift();
  }

  // Clear target after completing order
  creep.target = null;
};

module.exports = b;

