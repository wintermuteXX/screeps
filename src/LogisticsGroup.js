const CONSTANTS = require("./constants");

/**
 * LogisticsGroup - Central management for transport requests and transporters
 * Uses Gale-Shapley Stable Marriage Algorithm for optimal assignment
 */
function LogisticsGroup(room) {
  this.room = room;
  this.requests = []; // Array of request objects
  this.transporters = []; // Array of transporter creeps
  this.matching = {}; // Current assignment: { transporterId: requestId }
  this._lastMatchingTick = 0;
  this._dqdtCache = {}; // Cache for dq/dt calculations
}

/**
 * Adds a request
 * @param {Object} request - Request object with: target, resourceType, amount, dAmountdt, multiplier, id
 */
LogisticsGroup.prototype.addRequest = function (request) {
  // Check if request already exists
  const existing = this.requests.find((r) => r.id === request.id);
  if (existing) {
    // Update existing request
    Object.assign(existing, request);
    return;
  }
  
  this.requests.push(request);
  // Invalidate cache
  this._dqdtCache = {};
};

/**
 * Removes a request
 * @param {string} requestId - Request ID
 */
LogisticsGroup.prototype.removeRequest = function (requestId) {
  this.requests = this.requests.filter((r) => r.id !== requestId);
  // Remove from matching
  for (const transporterId in this.matching) {
    if (this.matching[transporterId] === requestId) {
      delete this.matching[transporterId];
    }
  }
  // Invalidate cache
  this._dqdtCache = {};
};

/**
 * Registers a transporter
 * @param {Creep} transporter - Transporter creep
 */
LogisticsGroup.prototype.registerTransporter = function (transporter) {
  if (!this.transporters.find((t) => t.id === transporter.id)) {
    // Store only the ID, not the full object (objects can become stale)
    this.transporters.push({ id: transporter.id });
  }
};

/**
 * Unregisters a transporter
 * @param {string} transporterId - Transporter ID
 */
LogisticsGroup.prototype.unregisterTransporter = function (transporterId) {
  this.transporters = this.transporters.filter((t) => t.id !== transporterId);
  delete this.matching[transporterId];
  // Invalidate cache
  this._dqdtCache = {};
};

/**
 * Calculates the expected resource amount upon arrival
 * @param {Creep} transporter - Transporter
 * @param {Object} request - Request
 * @returns {number} Expected amount
 */
LogisticsGroup.prototype.predictedAmount = function (transporter, request) {
  const target = Game.getObjectById(request.target);
  if (!target) return 0;
  
  // Base amount from request
  let amount = Math.abs(request.amount);
  
  // Consider dAmountdt (rate of resource accumulation)
  if (request.dAmountdt) {
    const [ticksUntilFree, newPos] = this.nextAvailability(transporter);
    const distance = this._getDistance(newPos, target.pos);
    const totalTicks = ticksUntilFree + distance;
    amount += request.dAmountdt * totalTicks;
  }
  
  // Reduce by already assigned transporters
  for (const otherTransporterId in this.matching) {
    if (this.matching[otherTransporterId] === request.id) {
      const otherTransporter = Game.getObjectById(otherTransporterId);
      if (otherTransporter && otherTransporter.id !== transporter.id) {
        const predictedCarry = this.predictedCarry(otherTransporter);
        const carryAmount = predictedCarry[request.resourceType] || 0;
        amount = Math.max(0, amount - carryAmount);
      }
    }
  }
  
  // Limit to actually available amount
  if (request.amount > 0) {
    // Request: resource is needed
    if (target.store) {
      amount = Math.min(amount, target.store.getFreeCapacity(request.resourceType) || 0);
    } else if (target instanceof Creep) {
      // For creeps
      amount = Math.min(amount, target.store.getFreeCapacity(request.resourceType) || 0);
    }
  } else {
    // Provide: resource is given away
    if (target.store) {
      amount = Math.min(amount, target.store[request.resourceType] || 0);
    }
  }
  
  return Math.max(0, amount);
};

/**
 * Calculates the expected carry status after current task
 * @param {Creep} transporter - Transporter
 * @returns {Object} Expected carry status { resourceType: amount }
 */
LogisticsGroup.prototype.predictedCarry = function (transporter) {
  const carry = {};
  
  // Current carry status
  for (const resourceType in transporter.store) {
    carry[resourceType] = transporter.store[resourceType];
  }
  
  // Consider current task
  const task = this.getTask(transporter);
  if (task) {
    if (task.action === "withdraw") {
      const target = Game.getObjectById(task.target);
      if (target && target.store) {
        const resourceType = task.resourceType;
        const available = target.store[resourceType] || 0;
        const capacity = transporter.store.getFreeCapacity(resourceType);
        carry[resourceType] = (carry[resourceType] || 0) + Math.min(available, capacity);
      }
    } else if (task.action === "transfer") {
      const resourceType = task.resourceType;
      const amount = task.amount || carry[resourceType] || 0;
      carry[resourceType] = Math.max(0, (carry[resourceType] || 0) - amount);
    }
  }
  
  return carry;
};

/**
 * Calculates when and where the transporter will be available next
 * @param {Creep} transporter - Transporter
 * @returns {Array} [ticksUntilFree, RoomPosition]
 */
LogisticsGroup.prototype.nextAvailability = function (transporter) {
  const task = this.getTask(transporter);
  
  if (!task) {
    return [0, transporter.pos];
  }
  
  // Estimate ticks until task is completed
  let ticksUntilFree = 0;
  let finalPos = transporter.pos;
  
  if (task.bufferTarget) {
    // Buffer stop on the way
    const bufferObj = Game.getObjectById(task.bufferTarget);
    if (!bufferObj) {
      // Buffer no longer exists
      return [0, transporter.pos];
    }
    // Type assertion: bufferObj has pos property (Structure, Creep, etc.)
    const bufferPos = /** @type {RoomObject} */ (/** @type {unknown} */ (bufferObj)).pos;
    if (!bufferPos) {
      return [0, transporter.pos];
    }
    const distanceToBuffer = this._getDistance(transporter.pos, bufferPos);
    ticksUntilFree += distanceToBuffer;
    finalPos = bufferPos;
  }
  
  const targetObj = Game.getObjectById(task.target);
  if (!targetObj) {
    // Target no longer exists
    return [0, transporter.pos];
  }
  // Type assertion: targetObj has pos property (Structure, Creep, etc.)
  const targetPos = /** @type {RoomObject} */ (/** @type {unknown} */ (targetObj)).pos;
  if (!targetPos) {
    return [0, transporter.pos];
  }
  const distanceToTarget = this._getDistance(finalPos, targetPos);
  ticksUntilFree += distanceToTarget;
  
  // Add 1-2 ticks for action (withdraw/transfer)
  ticksUntilFree += 2;
  
  return [ticksUntilFree, targetPos];
};

/**
 * Gets the current task for a transporter
 * @param {Creep} transporter - Transporter
 * @returns {Object|null} Task object or null
 */
LogisticsGroup.prototype.getTask = function (transporter) {
  // Check memory for current task
  if (transporter.memory.logisticsTask) {
    return transporter.memory.logisticsTask;
  }
  
  // Fallback: check targets array
  const targetData = transporter.getFirstTargetData();
  if (targetData) {
    return {
      target: targetData.id,
      action: targetData.action,
      resourceType: targetData.resourceType,
      amount: targetData.amount,
    };
  }
  
  return null;
};

/**
 * Calculates dq/dt for a transporter-request pair
 * @param {Creep} transporter - Transporter
 * @param {Object} request - Request
 * @returns {number} dq/dt value
 */
LogisticsGroup.prototype.calculateDqDt = function (transporter, request) {
  const cacheKey = `${transporter.id}_${request.id}`;
  if (this._dqdtCache[cacheKey] && this._dqdtCache[cacheKey].tick === Game.time) {
    return this._dqdtCache[cacheKey].value;
  }
  
  const choices = this.bufferChoices(transporter, request);
  
  if (choices.length === 0) {
    return 0;
  }
  
  // Choose best option (highest dq/dt)
  let bestChoice = choices[0];
  for (const choice of choices) {
    if (choice.dqdt > bestChoice.dqdt) {
      bestChoice = choice;
    }
  }
  
  // Cache result
  this._dqdtCache[cacheKey] = {
    tick: Game.time,
    value: bestChoice.dqdt,
    choice: bestChoice,
  };
  
  return bestChoice.dqdt;
};

/**
 * Calculates all possible buffer options for a request
 * @param {Creep} transporter - Transporter
 * @param {Object} request - Request
 * @returns {Array} Array of choice objects { dq, dt, dqdt, target, bufferTarget }
 */
LogisticsGroup.prototype.bufferChoices = function (transporter, request) {
  const choices = [];
  const target = Game.getObjectById(request.target);
  if (!target) {
    return choices;
  }
  
  const [ticksUntilFree, newPos] = this.nextAvailability(transporter);
  const predictedCarry = this.predictedCarry(transporter);
  const predictedAmount = this.predictedAmount(transporter, request);
  
  // Option 1: Direct to target (without buffer)
  const directDistance = this._getDistance(newPos, target.pos);
  const directDt = ticksUntilFree + directDistance;
  
  // Check transporter capacity
  const freeCapacity = transporter.store.getFreeCapacity(request.resourceType) || 0;
  const currentCarry = predictedCarry[request.resourceType] || 0;
  const transporterCapacity = transporter.store.getCapacity() || 0;
  const isFull = freeCapacity === 0;
  const isEmpty = transporter.store.getUsedCapacity() === 0;
  const hasAnyResources = transporter.store.getUsedCapacity() > 0;
  
  let directDq = 0;
  if (request.amount > 0) {
    // Request: transporter must deliver resource
    // If transporter has resource, use it (PRIORITY: deliver existing resources first)
    if (currentCarry > 0) {
      directDq = Math.min(predictedAmount, currentCarry);
    } else if (!isFull && !hasAnyResources) {
      // Transporter is empty and not full - can pick up from storage/buffer first
      // Allow matching with capacity (will need to pick up first)
      directDq = Math.min(predictedAmount, transporterCapacity);
    } else if (!isFull && hasAnyResources) {
      // Transporter has other resources but not this one - lower priority
      // Can still fulfill, but with lower dq/dt (must deliver other resources first)
      directDq = Math.min(predictedAmount, transporterCapacity) * 0.5; // Reduce priority
    }
    // If transporter is full and has no resource, cannot fulfill request directly
  } else {
    // Provide: transporter must pick up resource
    // Only if transporter has free capacity
    // If transporter is full and has resources, cannot pick up directly (must deliver first)
    if (isFull && hasAnyResources) {
      // Full transporter with resources - no direct "provide" requests allowed
      directDq = 0;
    } else if (freeCapacity > 0) {
      if (hasAnyResources) {
        // Transporter has other resources - lower priority for picking up new ones
        directDq = Math.min(predictedAmount, freeCapacity) * 0.3; // Much lower priority
      } else {
        // Transporter is empty - normal priority
        directDq = Math.min(predictedAmount, freeCapacity);
      }
    }
    // If transporter is full, cannot pick up more resources
  }
  
  // Only add choice if dq > 0 and dt is valid
  // Allow even if transporter is empty for requests (will need to pick up first)
  if (directDt > 0 && directDq > 0 && !isNaN(directDq / directDt) && directDq / directDt > 0) {
    choices.push({
      dq: directDq,
      dt: directDt,
      dqdt: directDq / directDt,
      target: request.target,
      bufferTarget: null,
    });
  }
  
  // Option 2: Via storage (if available)
  if (this.room.storage) {
    const storageDistance = this._getDistance(newPos, this.room.storage.pos);
    const targetDistance = this._getDistance(this.room.storage.pos, target.pos);
    const storageDt = ticksUntilFree + storageDistance + targetDistance;
    
    let storageDq = 0;
    if (request.amount > 0) {
      // Request: get from storage, deliver to target
      const storageAmount = this.room.storage.store[request.resourceType] || 0;
      // If transporter is full, must first deliver to storage, then pick up
      if (isFull && currentCarry === 0) {
        // Cannot fulfill - would need to drop off first, but storage might be full
        storageDq = 0;
      } else {
        storageDq = Math.min(
          predictedAmount,
          storageAmount,
          transporterCapacity
        );
      }
    } else {
      // Provide: get from target, deliver to storage
      // If transporter is full, can drop off at storage first, then pick up from target
      if (isFull) {
        // Can drop off current cargo at storage, then pick up from target
        const storageFreeCap = this.room.storage.store.getFreeCapacity(request.resourceType) || 0;
        const currentCargo = transporter.store.getUsedCapacity() || 0;
        // Can drop off current cargo, then pick up new resource
        storageDq = Math.min(
          predictedAmount,
          storageFreeCap,
          currentCargo // Can only pick up as much as we drop off
        );
      } else {
        // Normal case: has free capacity
        storageDq = Math.min(
          predictedAmount,
          freeCapacity,
          this.room.storage.store.getFreeCapacity(request.resourceType) || 0
        );
      }
    }
    
    if (storageDt > 0 && storageDq > 0) {
      choices.push({
        dq: storageDq,
        dt: storageDt,
        dqdt: storageDq / storageDt,
        target: request.target,
        bufferTarget: this.room.storage.id,
      });
    }
  }
  
  // Option 3: Via receiver links (if available)
  if (this.room.links && this.room.links.receivers && Array.isArray(this.room.links.receivers)) {
    for (const link of this.room.links.receivers) {
      if (!link) continue;
      if (request.resourceType === RESOURCE_ENERGY && link.energy === 0) continue;
      if (request.resourceType !== RESOURCE_ENERGY && link.store && link.store[request.resourceType] === 0 && request.amount > 0) continue;
      
      const linkDistance = this._getDistance(newPos, link.pos);
      const targetDistance = this._getDistance(link.pos, target.pos);
      const linkDt = ticksUntilFree + linkDistance + targetDistance;
      
      let linkDq = 0;
      if (request.amount > 0) {
        // Request: get from link, deliver to target
        const linkAmount = request.resourceType === RESOURCE_ENERGY 
          ? link.energy 
          : (link.store ? link.store[request.resourceType] || 0 : 0);
        linkDq = Math.min(
          predictedAmount,
          linkAmount,
          transporter.store.getCapacity() || 0
        );
      } else {
        // Provide: get from target, deliver to link
        const linkCapacity = request.resourceType === RESOURCE_ENERGY
          ? (link.energyCapacity - link.energy)
          : (link.store ? link.store.getFreeCapacity(request.resourceType) || 0 : 0);
        linkDq = Math.min(
          predictedAmount,
          transporter.store.getFreeCapacity(request.resourceType) || 0,
          linkCapacity
        );
      }
      
      if (linkDt > 0 && linkDq > 0) {
        choices.push({
          dq: linkDq,
          dt: linkDt,
          dqdt: linkDq / linkDt,
          target: request.target,
          bufferTarget: link.id,
        });
      }
    }
  }
  
  return choices;
};

/**
 * Gale-Shapley Stable Marriage Algorithm
 * @param {Object} transporterPrefs - { transporterId: [requestIds...] }
 * @param {Object} requestPrefs - { requestId: [transporterIds...] }
 * @returns {Object} Matching { transporterId: requestId }
 */
LogisticsGroup.prototype.galeShapleyMatching = function (transporterPrefs, requestPrefs) {
  const matching = {}; // { transporterId: requestId }
  const requestMatches = {}; // { requestId: transporterId }
  const transporterProposals = {}; // { transporterId: proposalIndex }
  
  // Initialize proposal indices
  for (const transporterId in transporterPrefs) {
    transporterProposals[transporterId] = 0;
  }
  
  let hasUnmatched = true;
  let iterations = 0;
  const maxIterations = 1000; // Safety limit
  
  while (hasUnmatched && iterations < maxIterations) {
    iterations++;
    hasUnmatched = false;
    
    for (const transporterId in transporterPrefs) {
      // Skip if already matched
      if (matching[transporterId]) continue;
      
      const prefs = transporterPrefs[transporterId];
      const proposalIndex = transporterProposals[transporterId];
      
      // No more preferences
      if (proposalIndex >= prefs.length) continue;
      
      hasUnmatched = true;
      const requestId = prefs[proposalIndex];
      transporterProposals[transporterId]++;
      
      // Check if request exists in requestPrefs
      if (!requestPrefs[requestId]) {
        // Request has no preferences - skip
        continue;
      }
      
      if (!requestMatches[requestId]) {
        // Request is free - match!
        matching[transporterId] = requestId;
        requestMatches[requestId] = transporterId;
      } else {
        // Request is already matched - check if better
        const currentTransporterId = requestMatches[requestId];
        const requestPref = requestPrefs[requestId];
        const currentIndex = requestPref.indexOf(currentTransporterId);
        const newIndex = requestPref.indexOf(transporterId);
        
        // If current transporter not in prefs, new one is better
        if (currentIndex === -1 && newIndex !== -1) {
          delete matching[currentTransporterId];
          matching[transporterId] = requestId;
          requestMatches[requestId] = transporterId;
        } else if (newIndex !== -1 && currentIndex !== -1 && newIndex < currentIndex) {
          // New transporter is better
          delete matching[currentTransporterId];
          matching[transporterId] = requestId;
          requestMatches[requestId] = transporterId;
        }
      }
    }
  }
  
  return matching;
};

/**
 * Runs matching and updates assignments
 * @returns {Object} Matching { transporterId: requestId }
 */
LogisticsGroup.prototype.runMatching = function () {
  // CPU limit: don't match every tick
  const matchingInterval = (CONSTANTS.LOGISTICS && CONSTANTS.LOGISTICS.MATCHING_INTERVAL) || 5;
  if (Game.time - this._lastMatchingTick < matchingInterval && Object.keys(this.matching).length > 0) {
    return this.matching;
  }
  
  // Limit number of requests/transporters for CPU efficiency
  const maxRequests = (CONSTANTS.LOGISTICS && CONSTANTS.LOGISTICS.MAX_REQUESTS) || 20;
  const maxTransporters = (CONSTANTS.LOGISTICS && CONSTANTS.LOGISTICS.MAX_TRANSPORTERS) || 20;
  
  const activeRequests = this.requests
    .filter((r) => {
      const target = Game.getObjectById(r.target);
      return target && Math.abs(r.amount) > 0;
    })
    .slice(0, maxRequests);
  
  const activeTransporters = this.transporters
    .filter((t) => {
      const creep = Game.getObjectById(t.id);
      return creep && creep.room === this.room;
    })
    .slice(0, maxTransporters);
  
  if (activeRequests.length === 0 || activeTransporters.length === 0) {
    this.matching = {};
    this._lastMatchingTick = Game.time;
    return this.matching;
  }
  
  // Create preferences for transporters
  const transporterPrefs = {};
  for (const transporter of activeTransporters) {
    const creep = Game.getObjectById(transporter.id);
    if (!creep) continue;
    
    let prefsWithDqdt = activeRequests.map((request) => {
      const dqdt = this.calculateDqDt(creep, request);
      return {
        request,
        dqdt: dqdt,
      };
    });
    
    // Filter "provide" requests for full transporters with resources
    const isFull = creep.store.getUsedCapacity() === creep.store.getCapacity();
    const hasResources = creep.store.getUsedCapacity() > 0;
    
    if (isFull && hasResources) {
      // Check which resources the transporter has
      const carriedResources = [];
      for (const resourceType in creep.store) {
        if (creep.store[resourceType] > 0) {
          carriedResources.push(resourceType);
        }
      }
      
      // Check if there are "request" requests for these resources
      const hasMatchingRequests = activeRequests.some(request => 
        request.amount > 0 && carriedResources.includes(request.resourceType)
      );
      
      if (hasMatchingRequests) {
        // Filter out all "provide" requests - transporter should deliver existing resources first
        prefsWithDqdt = prefsWithDqdt.filter(p => p.request.amount > 0);
      } else {
        // No matching requests - allow provide requests but with very low priority
        for (let i = 0; i < prefsWithDqdt.length; i++) {
          if (prefsWithDqdt[i].request.amount < 0) {
            prefsWithDqdt[i].dqdt = prefsWithDqdt[i].dqdt * 0.1; // Very low priority
          }
        }
      }
    }
    
    const prefs = prefsWithDqdt
      .filter((p) => p.dqdt > 0)
      .sort((a, b) => b.dqdt - a.dqdt)
      .map((p) => p.request.id);
    
    transporterPrefs[transporter.id] = prefs;
  }
  
  // Create preferences for requests
  const requestPrefs = {};
  for (const request of activeRequests) {
    const prefs = activeTransporters
      .map((transporter) => {
        const creep = Game.getObjectById(transporter.id);
        if (!creep) return null;
        return {
          transporter: transporter.id,
          dqdt: this.calculateDqDt(creep, request),
        };
      })
      .filter((p) => p && p.dqdt > 0)
      .sort((a, b) => b.dqdt - a.dqdt)
      .map((p) => p.transporter);
    
    requestPrefs[request.id] = prefs;
  }
  
  // Run Gale-Shapley matching
  this.matching = this.galeShapleyMatching(transporterPrefs, requestPrefs);
  this._lastMatchingTick = Game.time;
  
  return this.matching;
};

/**
 * Gets the assigned request for a transporter
 * @param {Creep} transporter - Transporter
 * @returns {Object|null} Request or null
 */
LogisticsGroup.prototype.getAssignedRequest = function (transporter) {
  const requestId = this.matching[transporter.id];
  if (!requestId) {
    return null;
  }
  
  const request = this.requests.find((r) => r.id === requestId) || null;
  return request;
};

/**
 * Helper function: calculates distance between two positions
 * @param {RoomPosition} pos1 - First position
 * @param {RoomPosition} pos2 - Second position
 * @returns {number} Distance in ticks
 */
LogisticsGroup.prototype._getDistance = function (pos1, pos2) {
  if (!pos1 || !pos2) return Infinity;
  if (pos1.roomName !== pos2.roomName) return Infinity;
  
  // Use getRangeTo for quick estimation
  // For more accurate calculation, PathFinder could be used, but that's CPU-intensive
  return pos1.getRangeTo(pos2);
};

/**
 * Add request (positive amount = resource is needed)
 * @param {Object} options - { target, resourceType, amount, dAmountdt?, multiplier?, id }
 */
LogisticsGroup.prototype.request = function (options) {
  const request = {
    target: options.target.id || options.target,
    resourceType: options.resourceType,
    amount: Math.abs(options.amount), // Always positive for request
    dAmountdt: options.dAmountdt || 0,
    multiplier: options.multiplier || 1,
    id: options.id || `${options.target.id}_${options.resourceType}_request`,
  };
  
  this.addRequest(request);
  return request.id;
};

/**
 * Add provide (negative amount = resource is given away)
 * @param {Object} options - { target, resourceType, amount, dAmountdt?, multiplier?, id }
 */
LogisticsGroup.prototype.provide = function (options) {
  const request = {
    target: options.target.id || options.target,
    resourceType: options.resourceType,
    amount: -Math.abs(options.amount), // Always negative for provide
    dAmountdt: options.dAmountdt || 0,
    multiplier: options.multiplier || 1,
    id: options.id || `${options.target.id}_${options.resourceType}_provide`,
  };
  
  this.addRequest(request);
  return request.id;
};

module.exports = LogisticsGroup;

