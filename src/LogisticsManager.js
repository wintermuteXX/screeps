const CONSTANTS = require("./constants");
const Log = require("Log");

/**
 * LogisticsManager - Centralized logistics system
 * 
 * Manages all transport jobs, matches sources with targets,
 * and assigns jobs to transporter creeps efficiently.
 */
function LogisticsManager(room) {
  this.room = room;
  this._jobs = null;
  this._jobCache = null;
  this._distanceCache = {};
  this._lastResourceHash = null;
  this._lastTick = -1;
}

/**
 * Main run function - called every tick
 * Processes all logistics and assigns jobs to creeps
 */
LogisticsManager.prototype.run = function (roomController) {
  // Skip if same tick (shouldn't happen, but safety check)
  if (this._lastTick === Game.time) {
    return;
  }
  this._lastTick = Game.time;
  
  // Get all transporters
  const transporters = roomController.getAllCreeps("transporter");
  
  // Check if resources changed (for caching)
  const resourceHash = this._calculateResourceHash(roomController);
  const resourcesChanged = resourceHash !== this._lastResourceHash;
  this._lastResourceHash = resourceHash;
  
  // Create jobs from givesResources and needsResources
  // Use cache if resources haven't changed and we have critical jobs assigned
  const jobs = this._getOrCreateJobs(roomController, resourcesChanged);
  
  // Debug output: Print all transport orders every 4 ticks
  if (Game.time % 10 === 0) {
    this._printTransportOrders(jobs, transporters, roomController);
  }
  
  // Early exit: if no transporters, skip assignment
  if (transporters.length === 0) {
    return;
  }
  
  // Early exit: if no jobs, skip assignment
  if (jobs.length === 0) {
    return;
  }
  
  // Assign jobs to transporters
  this._assignJobs(jobs, transporters, roomController);
  
  // Handle orphaned transporters (have resources but no job)
  this._handleOrphanedTransporters(transporters, roomController);
  
  // Store jobs in room memory for behaviors to access (only if changed)
  if (resourcesChanged) {
    this.room.memory.logisticsJobs = jobs.map(job => ({
      id: job.id,
      sourceId: job.source.id,
      targetId: job.target.id,
      resources: job.resources,
      assignedTo: job.assignedTo
    }));
  }
};

/**
 * Helper: Gets available amount from source object
 */
LogisticsManager.prototype._getAvailableAmount = function (sourceObj, resourceType, giveAmount) {
  if (sourceObj.store) {
    return sourceObj.store[resourceType] || 0;
  } else if (sourceObj.amount !== undefined) {
    // Dropped resource
    return sourceObj.amount;
  }
  return giveAmount;
};

/**
 * Helper: Gets still needed amount for target
 */
LogisticsManager.prototype._getStillNeeded = function (targetObj, resourceType, needAmount) {
  if (targetObj.store) {
    const currentAmount = targetObj.store[resourceType] || 0;
    const freeCap = targetObj.store.getFreeCapacity(resourceType) || 0;
    return Math.min(needAmount, freeCap);
  }
  return needAmount;
};

/**
 * Helper: Checks if give and need are compatible for transport
 */
LogisticsManager.prototype._isCompatible = function (give, need) {
  if (give.resourceType !== need.resourceType) return false;
  if (give.priority <= need.priority) return false; // give.priority must be > need.priority
  if (need.id === give.id) return false; // Can't transport to self
  return true;
};

/**
 * Gets jobs from cache or creates new ones
 */
LogisticsManager.prototype._getOrCreateJobs = function (roomController, resourcesChanged) {
  // Use cache if resources haven't changed and we have critical jobs assigned
  if (!resourcesChanged && this._jobCache) {
    // Check if all critical jobs are still assigned
    const criticalJobsAssigned = this._jobCache.every(job => {
      if (job.assignedTo) {
        const creep = Game.getObjectById(job.assignedTo);
        // @ts-ignore - creep.memory exists at runtime
        return creep && creep.memory.logisticsJob && creep.memory.logisticsJob.id === job.id;
      }
      return job.urgency > 5; // Only cache if non-critical jobs
    });
    
    if (criticalJobsAssigned) {
      return this._jobCache;
    }
  }
  
  // Create new jobs
  const jobs = this._createJobs(roomController);
  
  // Restore assignedTo information from creep memory
  const transporters = roomController.getAllCreeps("transporter");
  this._restoreJobAssignments(jobs, transporters);
  
  this._jobCache = jobs;
  return jobs;
};

/**
 * Creates all possible transport jobs
 * Groups multi-resource jobs when source and target are the same
 */
LogisticsManager.prototype._createJobs = function (roomController) {
  const givesResources = roomController.givesResources();
  const needsResources = roomController.needsResources();
  
  // First, create a map of source->target->resources
  const jobMap = {}; // key: "sourceId-targetId", value: { source, target, resources: [] }
  
  // Create all possible job combinations
  for (const give of givesResources) {
    for (const need of needsResources) {
      // Basic compatibility checks
      if (!this._isCompatible(give, need)) continue;
      
      // Get actual objects
      const sourceObj = Game.getObjectById(give.id);
      const targetObj = Game.getObjectById(need.id);
      if (!sourceObj || !targetObj) continue;
      
      // Calculate amounts
      const stillNeeded = this._getStillNeeded(targetObj, need.resourceType, need.amount);
      if (stillNeeded <= 0) continue;
      
      const available = this._getAvailableAmount(sourceObj, give.resourceType, give.amount);
      if (available <= 0) continue;
      
      // Group by source-target pair
      const key = `${give.id}-${need.id}`;
      if (!jobMap[key]) {
        jobMap[key] = {
          source: give,
          target: need,
          sourceObj: sourceObj,
          targetObj: targetObj,
          resources: []
        };
      }
      
      // Add resource to this job
      const transportAmount = Math.min(available, stillNeeded);
      jobMap[key].resources.push({
        resourceType: give.resourceType,
        sourceAmount: transportAmount,
        targetAmount: transportAmount,
        priority: need.priority
      });
    }
  }
  
  // Convert map to job array
  const jobs = [];
  for (const key in jobMap) {
    const jobData = jobMap[key];
    jobs.push(this._createJobFromData(jobData, key, roomController));
  }
  
  // Sort by score (lower = better)
  jobs.sort((a, b) => a.score - b.score);
  
  return jobs;
};

/**
 * Helper: Creates a job object from job data
 */
LogisticsManager.prototype._createJobFromData = function (jobData, key, roomController) {
  const distance = this._getDistance(jobData.sourceObj.pos, jobData.targetObj.pos);
  const urgency = this._calculateUrgency(jobData.target, roomController);
  const totalAmount = jobData.resources.reduce((sum, r) => sum + r.sourceAmount, 0);
  const minPriority = Math.min(...jobData.resources.map(r => r.priority));
  const score = this._calculateScore(minPriority, distance, urgency, totalAmount);
  
  return {
    id: `job_${Game.time}_${key}_${Math.random().toString(36).substr(2, 9)}`,
    source: {
      id: jobData.source.id,
      pos: jobData.sourceObj.pos,
      priority: jobData.source.priority
    },
    target: {
      id: jobData.target.id,
      pos: jobData.targetObj.pos,
      priority: minPriority,
      structureType: jobData.target.structureType
    },
    resources: jobData.resources,
    assignedTo: null,
    score: score,
    urgency: urgency,
    distance: distance,
    totalAmount: totalAmount,
    isMultiResource: jobData.resources.length > 1
  };
};

/**
 * Restores job assignments from creep memory when jobs are recreated
 */
LogisticsManager.prototype._restoreJobAssignments = function (jobs, transporters) {
  // Create a map of jobs by source-target-resources for matching
  const jobMap = {};
  for (const job of jobs) {
    const key = `${job.source.id}-${job.target.id}`;
    if (!jobMap[key]) {
      jobMap[key] = [];
    }
    jobMap[key].push(job);
  }
  
  // Check each transporter's existing job
  for (const transporter of transporters) {
    if (!transporter.memory.logisticsJob) continue;
    
    const existingJob = transporter.memory.logisticsJob;
    const key = `${existingJob.sourceId}-${existingJob.targetId}`;
    const matchingJobs = jobMap[key] || [];
    
    // Find matching job (same source, target, and similar resources)
    for (const job of matchingJobs) {
      // Check if resources match
      const jobResourceTypes = new Set(job.resources.map(r => r.resourceType));
      const existingResourceTypes = new Set((existingJob.resources || []).map(r => r.resourceType));
      
      // Check if resource types match
      if (jobResourceTypes.size === existingResourceTypes.size &&
          [...jobResourceTypes].every(rt => existingResourceTypes.has(rt))) {
        // This is the same job - restore assignment
        job.assignedTo = transporter.id;
        break;
      }
    }
  }
};

/**
 * Assigns jobs to transporters
 */
LogisticsManager.prototype._assignJobs = function (jobs, transporters, roomController) {
  // Track which transporters are already assigned
  const assignedTransporters = new Set();
  
  // Track which sources are being used (to prevent blocking)
  const sourceUsage = {}; // sourceId -> creepId[]
  
  for (const job of jobs) {
    // Skip if already assigned
    if (job.assignedTo) {
      // Mark transporter as assigned
      assignedTransporters.add(job.assignedTo);
      continue;
    }
    
    // Find best available transporter
    let bestTransporter = null;
    let bestScore = Infinity;
    
    for (const transporter of transporters) {
      // Skip if already assigned
      if (assignedTransporters.has(transporter.id)) continue;
      
      // Skip if transporter already has a valid job
      if (transporter.memory.logisticsJob) {
        const existingJob = transporter.memory.logisticsJob;
        // Check if existing job is still valid (same source/target)
        if (existingJob.sourceId === job.source.id && existingJob.targetId === job.target.id) {
          // Transporter already has this job - skip
          continue;
        }
      }
      
      // Skip if transporter has resources (should deliver first)
      if (transporter.store.getUsedCapacity() > 0) continue;
      
      // Check if transporter can handle this job
      const capacity = transporter.store.getCapacity();
      if (capacity < job.totalAmount) continue; // Not enough capacity
      
      // Check if another transporter is already going to this source
      const sourceId = job.source.id;
      const otherTransporters = sourceUsage[sourceId] || [];
      const controller = roomController.room.controller;
      const isSpecialCase = controller && controller.memory && job.target.id === controller.memory.containerID;
      
      if (otherTransporters.length > 0 && !isSpecialCase) {
        // Another transporter is already going to this source - skip to prevent blocking
        continue;
      }
      
      // Calculate transporter-specific score
      const distanceToSource = transporter.pos.getRangeTo(job.source.pos);
      const transporterScore = job.score + (distanceToSource * 0.1);
      
      if (transporterScore < bestScore) {
        bestScore = transporterScore;
        bestTransporter = transporter;
      }
    }
    
    // Assign job to best transporter
    if (bestTransporter) {
      job.assignedTo = bestTransporter.id;
      assignedTransporters.add(bestTransporter.id);
      
      // Track source usage
      if (!sourceUsage[job.source.id]) {
        sourceUsage[job.source.id] = [];
      }
      sourceUsage[job.source.id].push(bestTransporter.id);
      
      // Store job in creep memory
      bestTransporter.memory.logisticsJob = {
        id: job.id,
        sourceId: job.source.id,
        targetId: job.target.id,
        targetPriority: job.target.priority,
        resources: job.resources.map(r => ({
          resourceType: r.resourceType,
          amount: Math.min(r.sourceAmount, bestTransporter.store.getCapacity())
        }))
      };
      
      // Set target for backward compatibility
      bestTransporter.target = job.source.id;
      
      // Only log if this is a NEW assignment (not a restored one)
      const wasNewAssignment = !bestTransporter.memory.logisticsJob || 
                                bestTransporter.memory.logisticsJob.id !== job.id;
      
      if (wasNewAssignment) {
        // Temporary: Console output for new job assignment (compact table format)
        const sourceName = this._getObjectName(null, job.source.id).substring(0, 15);
        const targetName = this._getObjectName(null, job.target.id).substring(0, 15);
        const resourcesStr = job.resources.map(r => `${r.sourceAmount} ${r.resourceType[0]}`).join(",");
        console.log([
          '🚚 '.padEnd(2),
          bestTransporter.name.substring(0, 15).padEnd(15),
          sourceName.padEnd(15),
          targetName.padEnd(15),
          resourcesStr.padEnd(20),
          `P:${job.target.priority}`.padEnd(6),
          `D:${Math.round(job.distance)}`.padEnd(6)
        ].join(' | '));
      }
      
      Log.debug(
        `${this.room.name} Assigned job ${job.id} to ${bestTransporter.name}: ${job.resources.map(r => `${r.sourceAmount} ${r.resourceType}`).join(", ")} from ${job.source.id} to ${job.target.id}`,
        "LogisticsManager"
      );
    }
  }
};

/**
 * Helper: Validates if a job is still valid for a transporter
 * Returns: { isValid: boolean, reason: string }
 */
LogisticsManager.prototype._validateJob = function (transporter, jobMem) {
  if (!jobMem || !jobMem.targetId) {
    return { isValid: false, reason: "no job" };
  }
  
  const targetObj = Game.getObjectById(jobMem.targetId);
  if (!targetObj) {
    return { isValid: false, reason: "target no longer exists" };
  }
  
  const jobResources = jobMem.resources || [];
  let hasMatchingResources = false;
  let hasValidAmount = false;
  
  for (const jobRes of jobResources) {
    const actualAmount = transporter.store[jobRes.resourceType] || 0;
    if (actualAmount > 0) {
      hasMatchingResources = true;
      if (jobRes.amount > 0) {
        hasValidAmount = true;
      }
    }
  }
  
  if (hasMatchingResources && !hasValidAmount) {
    return { isValid: false, reason: "job completed but creep still has resources" };
  }
  
  if (!hasMatchingResources && transporter.store.getUsedCapacity() > 0) {
    return { isValid: false, reason: "job resources don't match actual resources" };
  }
  
  if (hasMatchingResources && hasValidAmount) {
    return { isValid: true, reason: null };
  }
  
  return { isValid: false, reason: "unknown" };
};

/**
 * Helper: Creates a fallback job from delivery order
 */
LogisticsManager.prototype._createFallbackJob = function (transporter, fallbackOrder) {
  const ordersArray = Array.isArray(fallbackOrder) ? fallbackOrder : [fallbackOrder];
  const primaryOrder = ordersArray[0];
  const targetObj = Game.getObjectById(primaryOrder.id);
  
  if (!targetObj) return false;
  
  // Collect unique resource types from all orders
  const resourceMap = {}; // resourceType -> amount
  for (const order of ordersArray) {
    if (order && order.resourceType) {
      const amount = transporter.store[order.resourceType] || 0;
      if (amount > 0) {
        // Use maximum amount if multiple orders for same resource type
        resourceMap[order.resourceType] = Math.max(resourceMap[order.resourceType] || 0, amount);
      }
    }
  }
  
  // Convert to array (deduplicated)
  const resources = Object.keys(resourceMap).map(resourceType => ({
    resourceType: resourceType,
    amount: resourceMap[resourceType]
  }));
  
  if (resources.length === 0) {
    return false; // No resources to deliver
  }
  
  transporter.memory.logisticsJob = {
    id: `fallback_${transporter.id}_${Game.time}`,
    sourceId: null, // Already has resources
    targetId: primaryOrder.id,
    resources: resources,
    isFallback: true
  };
  
  transporter.target = primaryOrder.id;
  
  // Temporary: Console output for fallback job assignment (compact table format)
  const targetName = this._getObjectName(targetObj, primaryOrder.id).substring(0, 15);
  const resourcesStr = resources.map(r => `${r.amount}${r.resourceType[0]}`).join(",");
  console.log([
    '🔄 FALLBACK'.padEnd(15),
    transporter.name.substring(0, 12).padEnd(12),
    '(im Store)'.padEnd(15),
    targetName.padEnd(15),
    resourcesStr.padEnd(20),
    'FALLBACK'.padEnd(6),
    '-'.padEnd(6)
  ].join(' | '));
  
  Log.debug(
    `${this.room.name} Assigned fallback job to ${transporter.name}: deliver to ${primaryOrder.id}`,
    "LogisticsManager"
  );
  
  return true;
};

/**
 * Handles orphaned transporters (have resources but no assigned job)
 * Uses fallback getDeliveryOrder() to find a delivery target
 */
LogisticsManager.prototype._handleOrphanedTransporters = function (transporters, roomController) {
  for (const transporter of transporters) {
    // Check if transporter has resources but no job
    if (transporter.store.getUsedCapacity() === 0) continue;
    
    // Check if already has a logistics job
    if (transporter.memory.logisticsJob) {
      const validation = this._validateJob(transporter, transporter.memory.logisticsJob);
      if (validation.isValid) {
        continue; // Job is still valid
      }
      
      // Job is invalid - clear it
      Log.warn(
        `${this.room.name} Clearing job for ${transporter.name} (${validation.reason})`,
        "LogisticsManager"
      );
      delete transporter.memory.logisticsJob;
      transporter.target = null;
    }
    
    // No valid job - try to find fallback delivery order
    const fallbackOrder = roomController.getDeliveryOrder(transporter, null);
    if (fallbackOrder) {
      this._createFallbackJob(transporter, fallbackOrder);
    }
  }
};

/**
 * Calculates urgency score based on target type
 * Lower urgency = more urgent
 */
LogisticsManager.prototype._calculateUrgency = function (target, roomController) {
  // Controller urgency
  const controller = roomController.room.controller;
  // @ts-ignore - controller.memory exists at runtime
  if (controller && controller.memory && target.id === controller.memory.containerID) {
    if (controller.ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_CRITICAL) {
      return 1; // Very urgent
    } else if (controller.ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_LOW) {
      return 5; // Urgent
    }
  }
  
  // Spawn urgency (if empty)
  const targetObj = Game.getObjectById(target.id);
  // @ts-ignore - targetObj may have structureType and store properties
  if (targetObj && targetObj.structureType === STRUCTURE_SPAWN) {
    // @ts-ignore - store property exists at runtime
    if (targetObj.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return 2; // Very urgent
    }
  }
  
  // Default: use priority as urgency indicator
  return target.priority;
};

/**
 * Calculates job score (lower is better)
 */
LogisticsManager.prototype._calculateScore = function (priority, distance, urgency, totalAmount) {
  const basePriority = priority;
  const distancePenalty = (distance / 50) * 0.1;
  const urgencyBonus = 1 / (urgency + 1);
  const capacityEfficiency = totalAmount / 1000; // Normalize by typical capacity
  
  // Lower score = better job
  const score = basePriority 
    + distancePenalty 
    - urgencyBonus * 10 // Urgency reduces score (makes it better)
    - capacityEfficiency * 0.1; // More resources = slightly better (efficiency)
  
  return score;
};

/**
 * Calculates a hash of current resources for caching
 */
LogisticsManager.prototype._calculateResourceHash = function (roomController) {
  const gives = roomController.givesResources();
  const needs = roomController.needsResources();
  
  // Create simple hash from resource counts
  let hash = "";
  for (const give of gives) {
    const obj = Game.getObjectById(give.id);
    // @ts-ignore - obj may have store or amount property
    if (obj && obj.store) {
      // @ts-ignore - store property exists at runtime
      hash += `${give.id}:${obj.store[give.resourceType] || 0};`;
      // @ts-ignore - obj may have amount property
    } else if (obj && obj.amount !== undefined) {
      // @ts-ignore - amount property exists at runtime
      hash += `${give.id}:${obj.amount};`;
    }
  }
  for (const need of needs) {
    const obj = Game.getObjectById(need.id);
    // @ts-ignore - obj may have store property
    if (obj && obj.store) {
      // @ts-ignore - store property exists at runtime
      hash += `${need.id}:${obj.store.getFreeCapacity(need.resourceType) || 0};`;
    }
  }
  
  return hash;
};

/**
 * Gets distance between two positions (cached)
 */
LogisticsManager.prototype._getDistance = function (pos1, pos2) {
  // Create cache key
  const key = `${pos1.roomName}_${pos1.x}_${pos1.y}_${pos2.roomName}_${pos2.x}_${pos2.y}`;
  
  // Check cache
  if (this._distanceCache[key] !== undefined) {
    return this._distanceCache[key];
  }
  
  // Calculate distance
  let distance;
  if (pos1.roomName !== pos2.roomName) {
    // Different rooms - use room distance
    distance = Game.map.getRoomLinearDistance(pos1.roomName, pos2.roomName) * 50;
  } else {
    distance = pos1.getRangeTo(pos2);
  }
  
  // Cache result (limit cache size to prevent memory issues)
  if (Object.keys(this._distanceCache).length < 1000) {
    this._distanceCache[key] = distance;
  }
  
  return distance;
};

/**
 * Helper: Gets display name for a game object
 */
LogisticsManager.prototype._getObjectName = function (obj, objId) {
  if (!objId) return 'Unknown';
  
  const gameObj = obj || Game.getObjectById(objId);
  if (!gameObj) return objId.substring(0, 8);
  
  // @ts-ignore - gameObj may have structureType, resourceType, or name property
  if (gameObj.structureType) {
    // @ts-ignore - structureType exists at runtime
    return gameObj.structureType;
    // @ts-ignore - resourceType exists at runtime
  } else if (gameObj.resourceType) {
    // @ts-ignore - resourceType exists at runtime
    return `Dropped ${gameObj.resourceType}`;
    // @ts-ignore - name exists at runtime
  } else if (gameObj.name) {
    // @ts-ignore - name exists at runtime
    return gameObj.name;
  }
  
  return gameObj.id.substring(0, 8);
};

/**
 * Helper: Gets assigned transporter name
 */
LogisticsManager.prototype._getAssignedName = function (job) {
  if (!job.assignedTo) return 'Unassigned';
  
  const creep = Game.getObjectById(job.assignedTo);
  if (creep) {
    // @ts-ignore - creep.name exists at runtime
    return creep.name || creep.id.substring(0, 8);
  }
  return job.assignedTo.substring(0, 8);
};

/**
 * Prints all transport orders in a nice table format
 */
LogisticsManager.prototype._printTransportOrders = function (jobs, transporters, roomController) {
  if (jobs.length === 0) {
    console.log(`[${this.room.name}] No transport orders available`);
    return;
  }
  
  console.log(`\n========== TRANSPORT ORDERS - ${this.room.name} (Tick ${Game.time}) ==========`);
  console.log(`Total Orders: ${jobs.length} | Available Transporters: ${transporters.length}`);
  console.log('─'.repeat(120));
  
  // Table header
  const header = [
    'ID'.padEnd(8),
    'Source'.padEnd(20),
    'Target'.padEnd(20),
    'Resources'.padEnd(25),
    'Priority'.padEnd(8),
    'Distance'.padEnd(8),
    'Score'.padEnd(8),
    'Assigned'.padEnd(15)
  ].join(' | ');
  console.log(header);
  console.log('─'.repeat(120));
  
  // Print each job
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const sourceName = this._getObjectName(null, job.source.id);
    const targetName = this._getObjectName(null, job.target.id);
    const resourcesStr = job.resources.map(r => `${r.sourceAmount} ${r.resourceType}`).join(', ');
    const assignedStr = this._getAssignedName(job);
    
    // Format row
    const row = [
      (i + 1).toString().padEnd(8),
      sourceName.substring(0, 20).padEnd(20),
      targetName.substring(0, 20).padEnd(20),
      resourcesStr.substring(0, 25).padEnd(25),
      job.target.priority.toString().padEnd(8),
      Math.round(job.distance).toString().padEnd(8),
      job.score.toFixed(2).padEnd(8),
      assignedStr.substring(0, 15).padEnd(15)
    ].join(' | ');
    
    console.log(row);
  }
  
  console.log('─'.repeat(120));
  
  // Summary
  const assignedCount = jobs.filter(j => j.assignedTo).length;
  const unassignedCount = jobs.length - assignedCount;
  console.log(`Summary: ${assignedCount} assigned, ${unassignedCount} unassigned`);
  console.log('='.repeat(120) + '\n');
};

/**
 * Gets assigned job for a creep
 */
LogisticsManager.prototype.getJob = function (creep) {
  if (!creep.memory.logisticsJob) {
    return null;
  }
  
  // Reconstruct job from memory
  const jobMem = creep.memory.logisticsJob;
  const sourceObj = jobMem.sourceId ? Game.getObjectById(jobMem.sourceId) : null;
  const targetObj = Game.getObjectById(jobMem.targetId);
  
  if (!targetObj) {
    // Target no longer exists
    delete creep.memory.logisticsJob;
    return null;
  }
  
  return {
    id: jobMem.id,
    source: sourceObj,
    target: targetObj,
    resources: jobMem.resources,
    isFallback: jobMem.isFallback || false,
    targetPriority: jobMem.targetPriority || 50
  };
};

module.exports = LogisticsManager;

