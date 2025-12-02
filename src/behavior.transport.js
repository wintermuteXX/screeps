const Behavior = require("_behavior");
const Log = require("Log");
const b = new Behavior("transport");

/**
 * When: Behavior is active if creep needs to get resources OR has resources to deliver
 */
b.when = function (creep, rc) {
  const hasResources = creep.store.getUsedCapacity() > 0;
  const isEmpty = creep.store.getUsedCapacity() === 0;
  
  if (hasResources) {
    // Creep has resources - check if there's a logistics job with target
    const job = rc.logistics.getJob(creep);
    if (job && job.target) {
      return true;
    }
    // No job but has resources - keep active for fallback job assignment
    return true;
  }
  
  if (isEmpty) {
    // Creep is empty - check if there's a logistics job to get resources
    const job = rc.logistics.getJob(creep);
    return job && job.source !== null;
  }
  
  return false;
};

/**
 * Completed: Behavior is completed when:
 * - Creep is empty and has no more resources to get, OR
 * - Creep has no resources left to deliver
 */
b.completed = function (creep, rc) {
  const hasResources = creep.store.getUsedCapacity() > 0;
  
  if (hasResources) {
    // Creep has resources - check if there's a valid target
    const job = rc.logistics.getJob(creep);
    return !job || !job.target;
  } else {
    // Creep is empty - check if it should get resources
    const job = rc.logistics.getJob(creep);
    return !job || !job.source;
  }
};

/**
 * Work: Handles both getting resources and transferring resources
 */
b.work = function (creep, rc) {
  const hasResources = creep.store.getUsedCapacity() > 0;
  
  if (hasResources) {
    // Transfer resources (delivery phase)
    this._transferResources(creep, rc);
  } else {
    // Get resources (collection phase)
    this._getResources(creep, rc);
  }
};

/**
 * Get resources phase - handles withdrawing/picking up resources
 */
b._getResources = function (creep, rc) {
  Log.debug(`${creep} is getting resources`, "transport");
  
  // Check for assigned logistics job
  const job = rc.logistics.getJob(creep);
  if (!job || !job.source) {
    // No job assigned - cannot proceed
    return;
  }
  
  let target = creep.getTarget();
  if (!target || target.id !== job.source.id) {
    creep.target = job.source.id;
    target = creep.getTarget();
  }
  
  if (!target) {
    // Source no longer exists - clear job
    delete creep.memory.logisticsJob;
    creep.target = null;
    return;
  }
  
  // Extract all resources from job
  const resourceTypes = [];
  const amounts = {};
  if (job.resources && Array.isArray(job.resources)) {
    for (const res of job.resources) {
      resourceTypes.push(res.resourceType);
      amounts[res.resourceType] = res.amount;
    }
  }
  
  if (resourceTypes.length === 0) {
    // No resources in job - clear it
    delete creep.memory.logisticsJob;
    creep.target = null;
    return;
  }
  
  // Process all resources (multi-resource support)
  let anyResourceLoaded = false;
  let allResourcesFullyLoaded = true;
  
  for (let resourceType of resourceTypes) {
    // Check if we already have enough of this resource
    const neededAmount = amounts[resourceType] || 0;
    const currentAmount = creep.store[resourceType] || 0;
    
    if (currentAmount >= neededAmount) {
      anyResourceLoaded = true;
      continue; // Already have enough
    }
    
    let result;
    // Check if target has a store (structures, tombstones, ruins) -> withdraw
    // Otherwise (Dropped Resources) -> pickup
    if (target.store !== undefined) {
      // Calculate how much to withdraw
      const available = target.store[resourceType] || 0;
      const freeCapacity = creep.store.getFreeCapacity(resourceType) || 0;
      const stillNeeded = neededAmount - currentAmount;
      const withdrawAmount = Math.min(stillNeeded, available, freeCapacity);
      
      if (withdrawAmount > 0) {
        result = creep.withdraw(target, resourceType, withdrawAmount);
        Log.debug(`creep${creep} tries to withdraw ${resourceType} (${withdrawAmount}) from ${target}: ${result}`, "transport");
      } else {
        // No capacity or no resources available
        Log.debug(`${creep} cannot withdraw ${resourceType}: available=${available}, freeCapacity=${freeCapacity}, stillNeeded=${stillNeeded}`, "transport");
        allResourcesFullyLoaded = false;
        continue;
      }
    } else {
      // Dropped resource - pickup (no resourceType needed for pickup)
      result = creep.pickup(target);
      Log.debug(`creep${creep} tries to pickup from ${target}: ${result}`, "transport");
      
      // For dropped resources, we need to check what resource type it is
      if (result === OK && target.resourceType) {
        resourceType = target.resourceType;
      }
    }
    
    switch (result) {
      case OK:
        Log.info(`${creep} successfully picked up ${resourceType} from ${target}`, "transport");
        anyResourceLoaded = true;
        
        // Update logistics job memory with actual amount picked up
        if (creep.memory.logisticsJob && creep.memory.logisticsJob.resources) {
          const resourceEntry = creep.memory.logisticsJob.resources.find(r => r.resourceType === resourceType);
          if (resourceEntry) {
            const actualAmount = creep.store[resourceType] || 0;
            const plannedAmount = amounts[resourceType] || 0;
            
            // Update to actual amount loaded
            resourceEntry.amount = actualAmount;
            
            // If less was loaded than planned, log warning
            if (actualAmount < plannedAmount) {
              Log.warn(
                `${creep} loaded less ${resourceType} than planned: ${actualAmount}/${plannedAmount}. Adjusting delivery amount.`,
                "transport"
              );
              allResourcesFullyLoaded = false;
            }
          }
        }
        break;
      case ERR_INVALID_TARGET:
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} had a problem. Status ${result} with target ${target}`, "transport");
        // If source is depleted (especially dropped resources), adjust job
        if (creep.memory.logisticsJob && creep.memory.logisticsJob.resources) {
          const resourceEntry = creep.memory.logisticsJob.resources.find(r => r.resourceType === resourceType);
          if (resourceEntry) {
            const actualAmount = creep.store[resourceType] || 0;
            if (actualAmount === 0) {
              // No resources of this type loaded - remove from job
              creep.memory.logisticsJob.resources = creep.memory.logisticsJob.resources.filter(
                r => r.resourceType !== resourceType
              );
              Log.warn(
                `${creep} Source depleted for ${resourceType}. Removing from job.`,
                "transport"
              );
            } else {
              // Some resources loaded, but less than planned - adjust amount
              resourceEntry.amount = actualAmount;
              Log.warn(
                `${creep} Only ${actualAmount} ${resourceType} available (planned: ${amounts[resourceType]}). Adjusting delivery.`,
                "transport"
              );
            }
          }
        }
        allResourcesFullyLoaded = false;
        break;
      case ERR_FULL:
        Log.info(`${creep} is full, cannot pick up more ${resourceType}`, "transport");
        anyResourceLoaded = true;
        allResourcesFullyLoaded = false;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target, {
          maxRooms: 0
        });
        return; // Move first, then continue next tick
        break;

      default:
        Log.warn(`${creep} gets unknown result from pickup/withdraw(${target}): ${result}`, "transport");
        allResourcesFullyLoaded = false;
    }
  }
  
  // After loading attempt, check if we got less than planned and adjust job
  if (creep.memory.logisticsJob && creep.memory.logisticsJob.resources) {
    // Remove resources that are not in store and have amount 0
    creep.memory.logisticsJob.resources = creep.memory.logisticsJob.resources.filter(resourceEntry => {
      const actualAmount = creep.store[resourceEntry.resourceType] || 0;
      if (actualAmount === 0 && resourceEntry.amount === 0) {
        Log.debug(`${creep} Removing ${resourceEntry.resourceType} from job (not loaded)`, "transport");
        return false;
      }
      // Update amount to actual amount in store
      resourceEntry.amount = actualAmount;
      return true;
    });
    
    // If no resources left in job, clear it
    if (creep.memory.logisticsJob.resources.length === 0) {
      delete creep.memory.logisticsJob;
      creep.target = null;
      Log.warn(`${creep} Job cleared: no resources loaded`, "transport");
      return;
    }
  }
  
  // If we loaded some resources and are full, or all resources are fully loaded, clear target
  if (anyResourceLoaded && (creep.store.getFreeCapacity() === 0 || allResourcesFullyLoaded)) {
    creep.target = null;
  }
};

/**
 * Transfer resources phase - handles delivering resources to targets
 */
b._transferResources = function (creep, rc) {
  Log.debug(`${creep} is transferring resources`, "transport");
  
  // Check if creep has resources
  if (creep.store.getUsedCapacity() === 0) {
    return;
  }
  
  // Check for assigned logistics job
  const job = rc.logistics.getJob(creep);
  if (!job || !job.target) {
    // No job assigned - wait for LogisticsManager to assign a fallback job
    return;
  }
  
  // Set target
  if (creep.target !== job.target.id) {
    creep.target = job.target.id;
  }
  
  const bestTarget = job.target;
  
  // Get actual resources from store that match job resources
  const resourcesToDeliver = [];
  for (const res of job.resources || []) {
    const actualAmount = creep.store[res.resourceType] || 0;
    if (actualAmount > 0) {
      // Use the minimum of: planned amount (from job), actual amount in store
      const deliveryAmount = Math.min(
        res.amount || actualAmount,
        actualAmount
      );
      
      resourcesToDeliver.push({
        resourceType: res.resourceType,
        amount: deliveryAmount,
        priority: job.targetPriority || 50
      });
    }
  }
  
  if (resourcesToDeliver.length === 0) {
    // No matching resources - clear job and let LogisticsManager find a new one
    delete creep.memory.logisticsJob;
    creep.target = null;
    return;
  }
  
  // Sort by priority (lowest priority number = highest priority)
  resourcesToDeliver.sort((a, b) => a.priority - b.priority);
  
  // Transfer each resource type
  let transferredAny = false;
  for (const resource of resourcesToDeliver) {
    const resourceType = resource.resourceType;
    const amount = creep.store[resourceType] || 0;
    
    if (amount <= 0) continue;
    
    // Check if target can still accept this resource
    // @ts-ignore - targetObj may have store property
    if (bestTarget.store) {
      // @ts-ignore - store property exists on structures/creeps
      const freeCapacity = bestTarget.store.getFreeCapacity(resourceType) || 0;
      if (freeCapacity <= 0) {
        // Target is full for this resource - skip
        continue;
      }
    }
    
    // Calculate transfer amount
    let transferAmount = amount;
    // @ts-ignore - bestTarget may have store property
    if (bestTarget.store) {
      // @ts-ignore - store property exists on structures/creeps
      const freeCapacity = bestTarget.store.getFreeCapacity(resourceType) || 0;
      transferAmount = Math.min(amount, freeCapacity);
    }
    
    if (transferAmount <= 0) continue;
    
    const result = creep.transfer(bestTarget, resourceType);
    
    switch (result) {
      case OK:
        Log.info(`${creep} successfully transfers ${resourceType} (${transferAmount}) to ${bestTarget}`, "transport");
        transferredAny = true;
        
        // Update logistics job: remove or reduce resource entry
        if (creep.memory.logisticsJob && creep.memory.logisticsJob.resources) {
          const jobResource = creep.memory.logisticsJob.resources.find(r => r.resourceType === resourceType);
          if (jobResource) {
            const remainingAmount = creep.store[resourceType] || 0;
            if (remainingAmount > 0) {
              // Update job resource amount to reflect remaining
              jobResource.amount = remainingAmount;
            } else {
              // This resource type is done, remove from job
              creep.memory.logisticsJob.resources = creep.memory.logisticsJob.resources.filter(r => r.resourceType !== resourceType);
            }
          }
          
          // Check if job has any valid resources left (amount > 0)
          const hasValidResources = creep.memory.logisticsJob.resources.some(r => r.amount > 0);
          
          // If no valid resources left in job, clear job to trigger new search
          if (!hasValidResources || creep.memory.logisticsJob.resources.length === 0) {
            Log.debug(
              `${creep} Job completed but still has ${creep.store.getUsedCapacity()} resources. Clearing job to find new delivery target.`,
              "transport"
            );
            delete creep.memory.logisticsJob;
            creep.target = null;
            // Will trigger new delivery order search in next tick
          }
        }
        
        // Check if all resources delivered
        if (creep.store.getUsedCapacity() === 0) {
          creep.target = null;
          creep.exact = false;
          creep.amount = 0;
          // Clear logistics job if all resources delivered
          if (creep.memory.logisticsJob) {
            delete creep.memory.logisticsJob;
          }
        }
        break;
        
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} had not enough resources for ${resourceType}. Why is this happening?`, "transport");
        // Update job to reflect actual amount
        if (creep.memory.logisticsJob && creep.memory.logisticsJob.resources) {
          const jobResource = creep.memory.logisticsJob.resources.find(r => r.resourceType === resourceType);
          if (jobResource) {
            jobResource.amount = creep.store[resourceType] || 0;
          }
        }
        break;
        
      case ERR_FULL:
        Log.info(`${creep} ${bestTarget} is full for ${resourceType}`, "transport");
        // Remove this resource from job and try next one
        if (creep.memory.logisticsJob && creep.memory.logisticsJob.resources) {
          creep.memory.logisticsJob.resources = creep.memory.logisticsJob.resources.filter(r => r.resourceType !== resourceType);
        }
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
        Log.warn(`${creep} has unknown result from transfer ${resourceType} to (${bestTarget}): ${result}`, "transport");
    }
  }
  
  // If no valid resources left in job after transfers, clear it
  if (creep.memory.logisticsJob && creep.memory.logisticsJob.resources) {
    const hasValidResources = creep.memory.logisticsJob.resources.some(r => {
      const actualAmount = creep.store[r.resourceType] || 0;
      return actualAmount > 0 && r.amount > 0;
    });
    
    if (!hasValidResources) {
      delete creep.memory.logisticsJob;
      creep.target = null;
    }
  }
};

module.exports = b;
