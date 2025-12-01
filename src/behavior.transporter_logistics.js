const Behavior = require("_behavior");
const Log = require("Log");

const b = new Behavior("transporter_logistics");

/**
 * When should this behavior be active?
 * - Transporter has a current task OR
 * - Transporter has an assigned request
 */
b.when = function (creep, rc) {
  if (!rc.logisticsGroup) {
    return false;
  }
  
  // Check if transporter already has a task
  const task = rc.logisticsGroup.getTask(creep);
  if (task) {
    // Task exists - check if it's still valid
    const target = Game.getObjectById(task.target);
    if (!target) {
      // Target no longer exists - delete task
      creep.memory.logisticsTask = null;
      creep.clearTargets();
      // Check if new request is assigned
      const assignedRequest = rc.logisticsGroup.getAssignedRequest(creep);
      return assignedRequest !== null;
    }
    return true; // Task is still active - behavior should stay active
  }
  
  // No task - check if transporter has resources that need to be delivered first
  const hasResources = creep.store.getUsedCapacity() > 0;
  if (hasResources) {
    // Transporter has resources - prioritize finding a request to deliver them
    // Check if there's a request for any resource the transporter has
    const assignedRequest = rc.logisticsGroup.getAssignedRequest(creep);
    if (assignedRequest) {
      // Check if transporter has the requested resource
      const hasRequestedResource = creep.store[assignedRequest.resourceType] > 0;
      if (hasRequestedResource && assignedRequest.amount > 0) {
        // Perfect match - can deliver existing resource
        return true;
      }
    }
    
    // Transporter has resources but no matching request - still activate to find delivery target
    // This allows the system to find a request for the resources the transporter has
    const assignedRequest2 = rc.logisticsGroup.getAssignedRequest(creep);
    return assignedRequest2 !== null;
  }
  
  // No task and no resources - check if request is assigned
  const assignedRequest = rc.logisticsGroup.getAssignedRequest(creep);
  return assignedRequest !== null;
};

/**
 * When is the behavior completed?
 * - Transporter has no task anymore
 */
b.completed = function (creep, rc) {
  if (!rc.logisticsGroup) return true;
  
  const task = rc.logisticsGroup.getTask(creep);
  return task === null;
};

/**
 * Main work logic for transporter
 */
b.work = function (creep, rc) {
  if (!rc.logisticsGroup) {
    return;
  }
  
  // Get current task
  let task = rc.logisticsGroup.getTask(creep);
  
  // If no task, get assigned request
  if (!task) {
    const assignedRequest = rc.logisticsGroup.getAssignedRequest(creep);
    if (!assignedRequest) {
      return; // No request assigned
    }
    
    // Create task from request
    task = this._createTaskFromRequest(creep, rc, assignedRequest);
    if (!task) {
      return;
    }
    
    // Save task in memory
    creep.memory.logisticsTask = task;
    
    // Add targets
    creep.clearTargets();
    if (task.bufferTarget) {
      // Buffer stop first
      const bufferAction = task.action === "transfer" ? "withdraw" : "withdraw";
      creep.addTarget(task.bufferTarget, bufferAction, task.resourceType, task.bufferAmount || task.amount);
    }
    // Then main target
    creep.addTarget(task.target, task.action, task.resourceType, task.amount);
  }
  
  // Execute current task
  this._executeTask(creep, rc, task);
};

/**
 * Creates a task from a request
 */
b._createTaskFromRequest = function (creep, rc, request) {
  const target = Game.getObjectById(request.target);
  if (!target) {
    // Request is invalid - remove from matching
    delete rc.logisticsGroup.matching[creep.id];
    return null;
  }
  
  // Calculate best buffer option
  const choices = rc.logisticsGroup.bufferChoices(creep, request);
  if (choices.length === 0) {
    // No valid options
    delete rc.logisticsGroup.matching[creep.id];
    return null;
  }
  
  // Choose best option
  let bestChoice = choices[0];
  for (const choice of choices) {
    if (choice.dqdt > bestChoice.dqdt) {
      bestChoice = choice;
    }
  }
  
  // Create task
  const task = {
    target: request.target,
    resourceType: request.resourceType,
    action: request.amount > 0 ? "transfer" : "withdraw",
    amount: Math.abs(request.amount),
    bufferTarget: bestChoice.bufferTarget || null,
    bufferAmount: bestChoice.dq || null,
  };
  
  return task;
};

/**
 * Executes a task
 */
b._executeTask = function (creep, rc, task) {
  // Check if buffer stop is still pending
  if (task.bufferTarget) {
    const bufferTarget = Game.getObjectById(task.bufferTarget);
    if (bufferTarget) {
      const bufferData = creep.getFirstTargetData();
      if (bufferData && bufferData.id === task.bufferTarget) {
        // Execute buffer stop
        this._executeAction(creep, bufferTarget, bufferData.action, bufferData.resourceType, bufferData.amount);
        return;
      }
    } else {
      // Buffer no longer exists - skip
      creep.removeFirstTarget();
    }
  }
  
  // Execute main task
  const mainTarget = Game.getObjectById(task.target);
  if (!mainTarget) {
    // Target no longer exists
    creep.memory.logisticsTask = null;
    creep.clearTargets();
    return;
  }
  
  const mainData = creep.getFirstTargetData();
  if (mainData && mainData.id === task.target) {
    this._executeAction(creep, mainTarget, mainData.action, mainData.resourceType, mainData.amount);
  } else if (!mainData) {
    // No more targets - task completed
    creep.memory.logisticsTask = null;
  }
};

/**
 * Executes a single action (withdraw or transfer)
 */
b._executeAction = function (creep, target, action, resourceType, amount) {
  if (!target) return;
  
  let result;
  
  if (action === "withdraw") {
    if (target.store !== undefined) {
      // Structure, Tombstone, Ruin
      if (amount && amount > 0) {
        result = creep.withdraw(target, resourceType, Math.min(amount, target.store[resourceType] || 0));
      } else {
        result = creep.withdraw(target, resourceType);
      }
    } else {
      // Dropped Resource
      result = creep.pickup(target);
    }
  } else if (action === "transfer") {
    if (amount && amount > 0) {
      const transferAmount = Math.min(amount, creep.store[resourceType] || 0);
      result = creep.transfer(target, resourceType, transferAmount);
    } else {
      result = creep.transfer(target, resourceType);
    }
  } else {
    return;
  }
  
  switch (result) {
    case OK:
      // Action successful - remove target
      creep.removeFirstTarget();
      
      // If all targets completed, delete task
      if (creep.getFirstTargetData() === null) {
        creep.memory.logisticsTask = null;
      }
      break;
      
    case ERR_NOT_IN_RANGE:
      // Move to target
      creep.travelTo(target, { maxRooms: 0 });
      break;
      
    case ERR_NOT_ENOUGH_RESOURCES:
    case ERR_INVALID_TARGET:
      // Target is invalid or empty - delete task
      creep.memory.logisticsTask = null;
      creep.clearTargets();
      break;
      
    case ERR_FULL:
      // Target is full - delete task
      creep.memory.logisticsTask = null;
      creep.clearTargets();
      break;
  }
};

module.exports = b;

