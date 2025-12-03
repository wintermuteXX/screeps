const ControllerSpawn = require("ControllerSpawn");
const ControllerCreep = require("ControllerCreep");
const ControllerLink = require("ControllerLink");
const ControllerTower = require("ControllerTower");
const ResourceManager = require("ResourceManager");
const ControllerTerminal = require("ControllerTerminal");
const ControllerFactory = require("ControllerFactory");
const ControllerLab = require("ControllerLab");
const RoomPlanner = require("RoomPlanner");
const CONSTANTS = require("./constants");
const Log = require("Log");

function ControllerRoom(room, ControllerGame) {
  this.room = room;
  this._find = {};
  this._spawns = [];
  this._towers = [];
  this._creepsByRole = null;  // Cache for getAllCreeps

  var spawns = this.find(FIND_MY_SPAWNS);
  for (var s in spawns) {
    var spawn = spawns[s];
    this._spawns.push(new ControllerSpawn(spawn, this));
  }

  this.links = new ControllerLink(this);

  var towers = this.room.towers;

  for (var t in towers) {
    var tower = towers[t];
    this._towers.push(new ControllerTower(tower, this));
  }

  this.terminal = new ControllerTerminal(this);
  this.factory = new ControllerFactory(this);
  this.labs = new ControllerLab(this);
  this.planner = new RoomPlanner(this.room);
}

ControllerRoom.prototype.run = function () {
  // Reset caches at the start of each tick
  this._creepsByRole = null;
  this._find = {};
  this._givesResources = null;
  this._needsResources = null;
  this._enemies = undefined;
  this._structuresToRepair = undefined;
  this._sources = null;
  this._sourcesNE = null;
  this._controllerNF = undefined;
  
  this.populate();

  // Run RoomPlanner (every 50 ticks to save CPU)
  if (Game.time % CONSTANTS.TICKS.ROOM_PLANNER === 0) {
    this.planner.run();
  }
  
  // Draw visualization every tick if active (independent of planner.run())
  // @ts-ignore - Memory object is dynamic at runtime
  if (this.room.memory.planner && this.room.memory.planner.visualizeUntil && Game.time <= this.room.memory.planner.visualizeUntil) {
    this.planner._drawVisualization();
    // Auto-disable after 15 ticks
    // @ts-ignore - Memory object is dynamic at runtime
    if (Game.time >= this.room.memory.planner.visualizeUntil) {
      // @ts-ignore - Memory object is dynamic at runtime
      this.room.memory.planner.visualizeUntil = null;
    }
  }

  this.links.transferEnergy();

  this.measureRclUpgradeTime();

  this.commandCreeps();

  // Tower operations - fire always, repair based on energy level
  const hasEnoughEnergy = this.room.getResourceAmount(RESOURCE_ENERGY, "all") > this.room.getRoomThreshold(RESOURCE_ENERGY, "all");
  const shouldRepair = hasEnoughEnergy || (Game.time % CONSTANTS.TICKS.REPAIR_TOWER === 0 && !(this.getLevel() === 8 && Math.random() >= 0.5));
  
  for (const tower of this._towers) {
    tower.fire();
    tower.heal();
    if (shouldRepair) {
      tower.repair();
    }
  }

  if (Game.time % CONSTANTS.TICKS.BUY_ENERGY_ORDER === 0) {
    this.terminal.buyEnergyOrder();
  }
  if (Game.time % CONSTANTS.TICKS.INTERNAL_TRADE === 0) {
    this.terminal.internalTrade();
  }
  if (Game.time % CONSTANTS.TICKS.SELL_MINERAL_OVERFLOW === 0) {
    this.terminal.sellRoomMineralOverflow();
  }
  if (Game.time % CONSTANTS.TICKS.SELL_MINERAL === 0) {
    this.terminal.sellRoomMineral();
  }
  if (Game.time % CONSTANTS.TICKS.ADJUST_WALL_HITS === 0) {
    this.terminal.adjustWallHits();
  }

  if (Game.cpu.limit - Game.cpu.getUsed() > 0 && Game.cpu.bucket > CONSTANTS.CPU.BUCKET_MEDIUM) {
    if (this.room.powerSpawn && this.room.powerSpawn.store.energy > 0 && this.room.powerSpawn.store.power > 0) {
      this.room.powerSpawn.processPower();
    }
  }

  if (Game.cpu.limit - Game.cpu.getUsed() > 0 && Game.cpu.bucket > CONSTANTS.CPU.BUCKET_MEDIUM) {
    if (Game.time % CONSTANTS.TICKS.LAB_CHECK_STATUS === 0) {
      this.labs.checkStatus();
    }
  }
  if (Game.cpu.limit - Game.cpu.getUsed() > 0 && Game.cpu.bucket > CONSTANTS.CPU.BUCKET_MEDIUM) {
    this.labs.produce();
  }
  // Automatically assign factory levels (each level 1-5 only once)
  if (this.room.factory) {
    this.factory.assignLevel();
  }
  if (Game.cpu.limit - Game.cpu.getUsed() > 0 && Game.cpu.bucket > CONSTANTS.CPU.BUCKET_LOW) {
    this.factory.produce();
  }
};

ControllerRoom.prototype.commandCreeps = function () {
  var cc = new ControllerCreep(this);
  var creeps = this.find(FIND_MY_CREEPS);

  for (var c in creeps) {
    cc.run(creeps[c]);
  }
};

ControllerRoom.prototype.populate = function () {
  if (Game.time % CONSTANTS.TICKS.CHECK_POPULATION !== 0) return;

  var spawn = null;

  var roles = global.getCreepRoles();
  var cfgCreeps = global.getCreepsConfig();

  if (spawn === null) spawn = this.getIdleSpawn();
  if (spawn === null) return;

  for (var i in roles) {
    var role = roles[i];

    var cfg = cfgCreeps[role];
    if (!cfg.produceGlobal || cfg.produceGlobal === false) {
      if (this._shouldCreateCreep(role, cfg)) {
        var result = spawn.createCreep(role, cfg);
        return;
      }
    }
  }
};

ControllerRoom.prototype.getTransportOrder = function (Creep) {
  let givesResources = this.givesResources();
  let needsResources = this.needsResources();
  
  // Get resources the creep is already carrying
  const carriedResources = [];
  if (Creep.memory.resources && Array.isArray(Creep.memory.resources)) {
    for (const res of Creep.memory.resources) {
      if (Creep.store[res.resourceType] > 0) {
        carriedResources.push(res.resourceType);
      }
    }
  }
  
  // Check if creep is empty or has free capacity
  const usedCapacity = Creep.store.getUsedCapacity();
  const totalCapacity = Creep.store.getCapacity();
  const freeCapacity = totalCapacity - usedCapacity;
  const isEmpty = usedCapacity === 0;
  
  // Collect all possible transport orders with scores
  const possibleOrders = [];
  
  for (var g in givesResources) {
    let give = givesResources[g];
    for (var n in needsResources) {
      let need = needsResources[n];
      
      // Check basic compatibility
      if (give.resourceType !== need.resourceType) continue;
      if (give.priority <= need.priority) continue; // give.priority must be > need.priority
      if (need.id === give.id) continue;
      
      // Check if another transporter is already assigned
      const assignedCount = this.getAssignedTransporters(need.id, need.resourceType);
      const targetObj = Game.getObjectById(need.id);
      if (!targetObj) continue;
      
      // Calculate how much is still needed
      let stillNeeded = need.amount;
      // @ts-ignore - targetObj may have store property
      if (targetObj.store) {
        // @ts-ignore - store property exists on structures/creeps
        const currentAmount = targetObj.store[need.resourceType] || 0;
        // @ts-ignore - store property exists on structures/creeps
        const freeCap = targetObj.store.getFreeCapacity(need.resourceType) || 0;
        stillNeeded = Math.min(need.amount, freeCap);
      }
      
      if (stillNeeded <= 0) continue;
      
      // Check assignment blocking
      const isSpecialCase = need.id === Creep.room.controller.memory.containerID;
      const hasOtherTransporters = this.getCreeps(null, give.id).length > 0;
      
      if (hasOtherTransporters && !isSpecialCase) {
        // Another transporter is already going to source - skip to prevent blocking
        continue;
      }
      
      // Calculate distance for prioritization
      // @ts-ignore - Game.getObjectById returns objects with pos
      const sourceObj = Game.getObjectById(give.id);
      if (!sourceObj) continue;
      // @ts-ignore - sourceObj has pos property
      const distanceToSource = Creep.pos.getRangeTo(sourceObj.pos);
      // @ts-ignore - targetObj and sourceObj have pos property
      const distanceToTarget = sourceObj.pos.getRangeTo(targetObj.pos);
      const totalDistance = distanceToSource + distanceToTarget;
      
      // Calculate score: lower is better
      // Priority: lower need.priority = higher priority
      // Distance: shorter = better
      // Already carrying: bonus if already carrying this resource type
      const alreadyCarrying = carriedResources.includes(give.resourceType);
      const priorityScore = need.priority;
      const distanceScore = totalDistance * 0.1; // Distance has less weight
      const carryingBonus = alreadyCarrying ? -5 : 0; // Bonus if already carrying
      
      const score = priorityScore + distanceScore + carryingBonus;
      
      possibleOrders.push({
        give: give,
        need: need,
        score: score,
        priority: need.priority,
        distance: totalDistance,
        alreadyCarrying: alreadyCarrying,
        stillNeeded: stillNeeded
      });
    }
  }
  
  if (possibleOrders.length === 0) {
    return null;
  }
  
  // Sort by score (lower = better)
  possibleOrders.sort((a, b) => {
    if (Math.abs(a.score - b.score) < 0.01) {
      // Scores are very close, prioritize already carrying
      if (a.alreadyCarrying !== b.alreadyCarrying) {
        return a.alreadyCarrying ? -1 : 1;
      }
      // Same carrying status, use priority
      return a.priority - b.priority;
    }
    return a.score - b.score;
  });
  
  // Select best order
  const bestOrder = possibleOrders[0];
  
  // If creep already has this resource type, prioritize filling up
  if (bestOrder.alreadyCarrying && freeCapacity > 0) {
    // Creep is already carrying this resource - good choice to continue
    Log.debug(
      `${this.room.name} ${bestOrder.need.structureType} (${bestOrder.need.priority}) needs ${bestOrder.stillNeeded} ${global.resourceImg(bestOrder.need.resourceType)} from ${bestOrder.give.structureType} (${
        bestOrder.give.priority
      }) which has ${bestOrder.give.amount}. Creep already carrying this resource.`,
      "getTransportOrder"
    );
    return bestOrder.give;
  }
  
  // If creep is empty, choose best order
  if (isEmpty) {
    Log.debug(
      `${this.room.name} ${bestOrder.need.structureType} (${bestOrder.need.priority}) needs ${bestOrder.stillNeeded} ${global.resourceImg(bestOrder.need.resourceType)} from ${bestOrder.give.structureType} (${
        bestOrder.give.priority
      }) which has ${bestOrder.give.amount}`,
      "getTransportOrder"
    );
    return bestOrder.give;
  }
  
  // Creep has other resources - only take this order if it's very high priority
  // or if we have significant free capacity
  if (freeCapacity > totalCapacity * 0.5) {
    // More than 50% free capacity - can take new resource type
    Log.debug(
      `${this.room.name} ${bestOrder.need.structureType} (${bestOrder.need.priority}) needs ${bestOrder.stillNeeded} ${global.resourceImg(bestOrder.need.resourceType)} from ${bestOrder.give.structureType}. Creep has free capacity.`,
      "getTransportOrder"
    );
    return bestOrder.give;
  }
  
  // Creep is mostly full with other resources - skip for now
  return null;
};

/**
 * Gets assigned transporters for a specific target and resource type
 * @param {string} targetId - Target ID
 * @param {string} resourceType - Resource type
 * @returns {number} Number of transporters already assigned
 */
ControllerRoom.prototype.getAssignedTransporters = function (targetId, resourceType) {
  const transporters = this.getAllCreeps("transporter");
  let count = 0;
  
  for (const transporter of transporters) {
    // Check if transporter has this resource type
    const hasResource = transporter.store[resourceType] > 0;
    if (!hasResource) continue;
    
    // Check if transporter is targeting this destination
    const target = transporter.getTarget();
    if (target && target.id === targetId) {
      count++;
    } else if (transporter.memory.resources && Array.isArray(transporter.memory.resources)) {
      const resourceEntry = transporter.memory.resources.find(r => r.resourceType === resourceType);
      if (resourceEntry && resourceEntry.target === targetId) {
        count++;
      }
    }
  }
  
  return count;
};

/**
 * Gets delivery order(s) for a creep
 * @param {Creep} Creep - The creep
 * @param {string|null} resourceType - Specific resource type to find order for, or null for all
 * @returns {Object|Array|null} Single order, array of orders, or null
 */
ControllerRoom.prototype.getDeliveryOrder = function (Creep, resourceType = null) {
  let needsResources = this.needsResources();
  
  // Get resources the creep is carrying
  const carriedResources = [];
  if (Creep.memory.resources && Array.isArray(Creep.memory.resources)) {
    for (const res of Creep.memory.resources) {
      if (Creep.store[res.resourceType] > 0) {
        carriedResources.push(res.resourceType);
      }
    }
  } else {
    // Fallback: find all resources in store if memory.resources not set
    for (const resType in Creep.store) {
      if (Creep.store[resType] > 0) {
        carriedResources.push(resType);
      }
    }
  }
  
  if (carriedResources.length === 0) {
    return null;
  }
  
  // Filter by specific resource type if requested
  const resourcesToCheck = resourceType ? [resourceType] : carriedResources;
  
  // Find matching orders for all carried resources
  const matchingOrders = [];
  
  for (const resType of resourcesToCheck) {
    if (Creep.store[resType] <= 0) continue;
    
    for (var n in needsResources) {
      let need = needsResources[n];
      
      // Check if resource type matches
      if (need.resourceType !== resType) continue;
      
      // Check if target is different from source
      if (need.id === Creep.id) continue;
      
      // Check assignment count (prevent blocking)
      const assignedCount = this.getAssignedTransporters(need.id, resType);
      // @ts-ignore - Game.getObjectById can return various types
      const targetObj = Game.getObjectById(need.id);
      if (!targetObj) continue;
      
      // Calculate how much is still needed
      let stillNeeded = need.amount;
      // @ts-ignore - targetObj may have store property
      if (targetObj.store) {
        // @ts-ignore - store property exists on structures/creeps
        const currentAmount = targetObj.store[resType] || 0;
        // @ts-ignore - store property exists on structures/creeps
        const freeCapacity = targetObj.store.getFreeCapacity(resType) || 0;
        stillNeeded = Math.min(need.amount, freeCapacity);
      }
      
      // Skip if already enough transporters assigned or target is full
      if (stillNeeded <= 0) continue;
      
      // Check if this is a special case (controller container)
      const isSpecialCase = need.id === Creep.room.controller.memory.containerID;
      
      // Check if this is the creep's current target - if so, allow it even if other transporters are going there
      // This prevents switching targets every tick
      const isCurrentTarget = Creep.target === need.id;
      
      // Only check for other transporters if this is NOT the current target
      // This allows the creep to keep its current target even if another transporter is also going there
      if (!isCurrentTarget && !isSpecialCase) {
        const hasOtherTransporters = this.getCreeps(null, need.id).length > 0;
        if (hasOtherTransporters) {
          // Another transporter is already going there - skip to prevent blocking
          // BUT: if this is our current target, keep it to prevent switching
          continue;
        }
      }
      
      // Calculate distance for prioritization
      // @ts-ignore - targetObj has pos property
      const distance = Creep.pos.getRangeTo(targetObj.pos);
      
      // Calculate score: lower priority number = higher priority, distance matters
      // Score = priority / (distance + 1) - lower is better
      // Use integer distance to make score more stable (less sensitive to small movements)
      const intDistance = Math.floor(distance);
      let score = need.priority / (intDistance + 1);
      
      // Bonus: If this is the current target, give it a significant bonus to keep it
      // This prevents switching when scores are similar
      if (isCurrentTarget) {
        score = score * 0.5; // Halve the score (lower = better) to strongly prefer current target
      }
      
      matchingOrders.push({
        resourceType: resType,
        need: need,
        score: score,
        priority: need.priority,
        distance: intDistance,
        stillNeeded: stillNeeded,
        targetId: need.id, // Store target ID for stable comparison
        orderIndex: matchingOrders.length // Store original index for stability
      });
    }
  }
  
  // Sort by score (lower = better), then by priority, then by target ID for stability
  // Use a larger threshold for score comparison to prevent switching due to small changes
  // IMPORTANT: Use targetId as primary tie-breaker to ensure stable ordering
  matchingOrders.sort((a, b) => {
    const scoreDiff = Math.abs(a.score - b.score);
    if (scoreDiff < 0.1) {
      // Scores are very close (within 0.1), use priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Same priority AND same score - use target ID for stable ordering
      // This ensures the same target is always chosen when scores are equal
      if (a.targetId && b.targetId) {
        return a.targetId.localeCompare(b.targetId);
      }
      // Fallback to distance if no IDs
      return a.distance - b.distance;
    }
    return a.score - b.score;
  });
  
  
  // Return format: if resourceType specified, return single order; otherwise return array
  if (matchingOrders.length > 0) {
    if (resourceType !== null) {
      // Specific resource type requested - return best matching order for this type
      const bestForType = matchingOrders.find(o => o.resourceType === resourceType);
      if (bestForType) {
        Log.debug(`${this.room.name} ${Creep.name} transports ${bestForType.stillNeeded} ${global.resourceImg(bestForType.resourceType)} to ${bestForType.need.structureType}`, "getDeliveryOrder");
        return bestForType.need;
      }
      // If specific type not found but other orders exist, return null (for backward compatibility)
      return null;
    } else {
      // No specific resource type - return array of all matching orders
      return matchingOrders.map(o => o.need);
    }
  }
  
  return null;
};

/**
 * Helper function to add a resource entry to givesResources array
 */
ControllerRoom.prototype._addGivesResource = function (entry) {
  if (!this._givesResources) {
    this._givesResources = [];
  }
  this._givesResources.push(entry);
};

/**
 * Helper function to check if position is too close to controller
 */
ControllerRoom.prototype._isTooCloseToController = function (pos) {
  return pos.inRangeTo(this.room.controller.pos, CONSTANTS.CONTROLLER.RANGE_FOR_DROPPED_RESOURCES);
};

/**
 * Process tombstones that can give resources
 */
ControllerRoom.prototype._processTombstones = function () {
  this.find(FIND_TOMBSTONES).forEach((tombstone) => {
    for (var resourceType in tombstone.store) {
      var amount = tombstone.store[resourceType];
      if (amount > CONSTANTS.RESOURCES.TOMBSTONE_MIN) {
        this._addGivesResource({
          priority: CONSTANTS.PRIORITY.TOMBSTONE,
          resourceType: resourceType,
          structureType: tombstone.structureType,
          amount: amount,
          id: tombstone.id,
        });
      }
    }
  });
};

/**
 * Process ruins that can give resources
 * Ruins contain resources from destroyed structures
 */
ControllerRoom.prototype._processRuins = function () {
  this.find(FIND_RUINS).forEach((ruin) => {
    for (var resourceType in ruin.store) {
      var amount = ruin.store[resourceType];
      if (amount > 0) {
        this._addGivesResource({
          priority: CONSTANTS.PRIORITY.RUIN,
          resourceType: resourceType,
          structureType: ruin.structure ? ruin.structure.structureType : "ruin",
          amount: amount,
          id: ruin.id,
        });
      }
    }
  });
};

/**
 * Process links that can give energy
 */
ControllerRoom.prototype._processLinks = function () {
  if (!this.links.receivers) return;
  
  for (var link of this.links.receivers) {
    if (link.energy > 0 && !this._isTooCloseToController(link.pos)) {
      this._addGivesResource({
        priority: CONSTANTS.PRIORITY.LINK,
        resourceType: RESOURCE_ENERGY,
        structureType: link.structureType,
        amount: link.energy,
        id: link.id,
      });
    }
  }
};

/**
 * Process dropped resources
 */
ControllerRoom.prototype._processDroppedResources = function () {
  for (var resource of this.find(FIND_DROPPED_RESOURCES)) {
    if (resource.amount > CONSTANTS.RESOURCES.DROPPED_MIN && !this._isTooCloseToController(resource.pos)) {
      this._addGivesResource({
        priority: CONSTANTS.PRIORITY.DROPPED_RESOURCE,
        resourceType: resource.resourceType,
        amount: resource.amount,
        id: resource.id,
      });
    }
  }
};

/**
 * Process containers that can give resources
 */
ControllerRoom.prototype._processContainers = function () {
  var containers = [];
  
  // Get containers from sources
  var sources = this.getSources();
  for (var source of sources) {
    if (source && source.container) {
      containers.push(source.container);
    }
  }
  
  // Get container from extractor
  if (this.room.extractor && this.room.extractor.container) {
    containers.push(this.room.extractor.container);
  }
  
  for (var container of containers) {
    if (!container || !container.store) continue;
    
    for (var resourceType in container.store) {
      var amount = container.store[resourceType];
      if (amount > CONSTANTS.RESOURCES.CONTAINER_MIN) {
        this._addGivesResource({
          priority: CONSTANTS.PRIORITY.CONTAINER,
          resourceType: resourceType,
          structureType: container.structureType,
          amount: amount,
          id: container.id,
        });
      }
    }
  }
};

/**
 * Process labs that can give resources
 */
ControllerRoom.prototype._processLabs = function () {
  if (!this.room.labs) return;
  
  for (var lab of this.room.labs) {
    if (!lab.memory || lab.memory.status !== "empty") continue;
    
    var result = lab.getFirstMineral();
    if (result && result.amount > 0) {
      this._addGivesResource({
        priority: CONSTANTS.PRIORITY.LAB_EMPTY,
        resourceType: result.resource,
        structureType: lab.structureType,
        amount: result.amount,
        id: lab.id,
      });
    }
  }
};

/**
 * Process factory overflow resources
 */
ControllerRoom.prototype._processFactory = function () {
  var factory = this.room.factory;
  if (!factory) return;
  
  for (var resourceType of RESOURCES_ALL) {
    var fillLevel = this.room.getRoomThreshold(resourceType, "factory");
    var amount = ResourceManager.getResourceAmount(this.room, resourceType, "factory");
    
    if (amount > fillLevel) {
      this._addGivesResource({
        priority: CONSTANTS.PRIORITY.FACTORY_OVERFLOW,
        structureType: factory.structureType,
        resourceType: resourceType,
        amount: amount - fillLevel,
        id: factory.id,
        exact: true,
      });
    }
  }
};

/**
 * Process storage resources
 */
ControllerRoom.prototype._processStorage = function () {
  var storage = this.room.storage;
  if (!storage) return;
  
  for (var resourceType of RESOURCES_ALL) {
    var amount = ResourceManager.getResourceAmount(this.room, resourceType, "storage");
    if (amount === 0) continue;
    
    var fillLevel = this.room.getRoomThreshold(resourceType, "storage");
    var priority;
    var giveAmount;
    
    if (resourceType === RESOURCE_ENERGY) {
      if (amount <= fillLevel) {
        priority = CONSTANTS.PRIORITY.STORAGE_ENERGY_LOW;
        giveAmount = amount;
      } else {
        priority = CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW;
        giveAmount = amount - fillLevel;
      }
    } else {
      // Minerals
      if (amount > fillLevel) {
        priority = CONSTANTS.PRIORITY.STORAGE_MINERAL_OVERFLOW;
        giveAmount = amount - fillLevel;
      } else {
        priority = CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
        giveAmount = amount;
      }
    }
    
    this._addGivesResource({
      priority: priority,
      structureType: storage.structureType,
      resourceType: resourceType,
      amount: giveAmount,
      id: storage.id,
      exact: true,
    });
  }
};

/**
 * Process terminal resources
 */
ControllerRoom.prototype._processTerminal = function () {
  var terminal = this.room.terminal;
  if (!terminal) return;
  
  var energyThreshold = this.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
  
  for (var resourceType of RESOURCES_ALL) {
    var amount = ResourceManager.getResourceAmount(this.room, resourceType, "terminal");
    var priority;
    var giveAmount;
    
    if (resourceType === RESOURCE_ENERGY) {
      if (amount <= energyThreshold) {
        priority = CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW;
        giveAmount = amount;
      } else {
        priority = CONSTANTS.PRIORITY.TERMINAL_ENERGY_HIGH;
        giveAmount = amount - energyThreshold;
      }
    } else {
      // Minerals
      if (amount > 0) {
        priority = CONSTANTS.PRIORITY.TERMINAL_MINERAL;
        giveAmount = amount;
      } else {
        continue;
      }
    }
    
    this._addGivesResource({
      priority: priority,
      structureType: terminal.structureType,
      resourceType: resourceType,
      amount: giveAmount,
      id: terminal.id,
    });
  }
};

/**
 * Get all resources that can be given/transported from this room
 * Returns sorted array by priority (highest first)
 */
ControllerRoom.prototype.givesResources = function () {
  if (!this._givesResources) {
    this._givesResources = [];
    
    // Process all resource sources
    this._processTombstones();
    this._processRuins();
    this._processLinks();
    this._processDroppedResources();
    this._processContainers();
    this._processLabs();
    this._processFactory();
    this._processStorage();
    this._processTerminal();
    
    // Sort by priority (highest first)
    this._givesResources.sort((a, b) => b.priority - a.priority);
  }
  
  return this._givesResources;
};

/**
 * Helper function to add a resource entry to needsResources array
 */
ControllerRoom.prototype._addNeedsResource = function (entry) {
  if (!this._needsResources) {
    this._needsResources = [];
  }
  this._needsResources.push(entry);
};

/**
 * Get controller priority based on ticks to downgrade
 */
ControllerRoom.prototype._getControllerPriority = function () {
  if (!this.room.controller) {
    return CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
  }
  
  if (this.room.controller.ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_CRITICAL) {
    return CONSTANTS.PRIORITY.CONTROLLER_CRITICAL;
  } else if (this.room.controller.ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_LOW) {
    return CONSTANTS.PRIORITY.CONTROLLER_LOW;
  }
  
  return CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
};

/**
 * Process upgrader creeps that need energy (when no container at controller)
 */
ControllerRoom.prototype._processUpgraders = function (priority) {
  if (!this.room.controller || this.room.controller.container) return;
  
  var upgraders = this.getCreeps("upgrader");
  for (var upgrader of upgraders) {
    var freeCapacity = upgrader.store.getFreeCapacity(RESOURCE_ENERGY);
    if (freeCapacity > 0) {
      this._addNeedsResource({
        priority: priority,
        resourceType: RESOURCE_ENERGY,
        amount: freeCapacity,
        id: upgrader.id,
      });
    }
  }
};

/**
 * Process controller container that needs energy
 */
ControllerRoom.prototype._processController = function (priority) {
  var controllerContainer = this.getControllerNotFull();
  if (controllerContainer) {
    var freeCapacity = controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY);
    if (freeCapacity > 0) {
      this._addNeedsResource({
        priority: priority,
        structureType: controllerContainer.structureType,
        resourceType: RESOURCE_ENERGY,
        amount: freeCapacity,
        id: controllerContainer.id,
      });
    }
  }
};

/**
 * Process constructor creeps that need energy
 */
ControllerRoom.prototype._processConstructors = function () {
  var constructors = this.getCreeps("constructor");
  for (var constructor of constructors) {
    var freeCapacity = constructor.store.getFreeCapacity(RESOURCE_ENERGY);
    var capacity = constructor.store.getCapacity();
    
    // Only add if more than half capacity is free
    if (freeCapacity > capacity / 2) {
      this._addNeedsResource({
        priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_MID,
        structureType: constructor.structureType,
        resourceType: RESOURCE_ENERGY,
        amount: freeCapacity,
        id: constructor.id,
      });
    }
  }
};

/**
 * Process labs that need resources for filling
 */
ControllerRoom.prototype._processLabsNeeds = function () {
  if (!this.room.labs) return;
  
  for (var lab of this.room.labs) {
    if (!lab.memory || lab.memory.status !== "fill" || !lab.memory.usedBy) continue;
    
    var resourceType = lab.memory.resource;
    if (!resourceType) continue;
    
    var freeCapacity = lab.store.getFreeCapacity(resourceType);
    if (freeCapacity > 0) {
      this._addNeedsResource({
        priority: CONSTANTS.PRIORITY.LAB_FILL,
        resourceType: resourceType,
        structureType: lab.structureType,
        amount: freeCapacity,
        id: lab.id,
      });
    }
  }
};

/**
 * Process structures that need resources (towers, spawns, extensions, etc.)
 */
ControllerRoom.prototype._processStructures = function () {
  if (!this.room.controller || !this.room.controller.my) return;
  
  // Determine tower priority based on enemies
  var towerPriority = this.getEnemys().length > 0 
    ? CONSTANTS.PRIORITY.TOWER_ENEMY 
    : CONSTANTS.PRIORITY.TOWER_NORMAL;
  
  // Process towers
  var towerNeeds = this.structuresNeedResource(this.room.towers, RESOURCE_ENERGY, towerPriority, 400);
  for (var need of towerNeeds) {
    this._addNeedsResource(need);
  }
  
  // Process spawns
  var spawnNeeds = this.structuresNeedResource(this.room.spawns, RESOURCE_ENERGY, CONSTANTS.PRIORITY.SPAWN);
  for (var need of spawnNeeds) {
    this._addNeedsResource(need);
  }
  
  // Process extensions
  var extensionNeeds = this.structuresNeedResource(this.room.extensions, RESOURCE_ENERGY, CONSTANTS.PRIORITY.EXTENSION);
  for (var need of extensionNeeds) {
    this._addNeedsResource(need);
  }
  
  // Process labs (for energy)
  var labNeeds = this.structuresNeedResource(this.room.labs, RESOURCE_ENERGY, CONSTANTS.PRIORITY.LAB);
  for (var need of labNeeds) {
    this._addNeedsResource(need);
  }
  
  // Process power spawn
  if (this.room.powerSpawn) {
    var powerSpawnEnergyNeeds = this.structuresNeedResource([this.room.powerSpawn], RESOURCE_ENERGY, CONSTANTS.PRIORITY.POWER_SPAWN_ENERGY, 400);
    for (var need of powerSpawnEnergyNeeds) {
      this._addNeedsResource(need);
    }
    
    var powerSpawnPowerNeeds = this.structuresNeedResource([this.room.powerSpawn], RESOURCE_POWER, CONSTANTS.PRIORITY.POWER_SPAWN_POWER, 90);
    for (var need of powerSpawnPowerNeeds) {
      this._addNeedsResource(need);
    }
  }
  
  // Process nuker
  if (this.room.nuker) {
    var nukerEnergyNeeds = this.structuresNeedResource([this.room.nuker], RESOURCE_ENERGY, CONSTANTS.PRIORITY.NUKER_ENERGY);
    for (var need of nukerEnergyNeeds) {
      this._addNeedsResource(need);
    }
    
    var nukerGhodiumNeeds = this.structuresNeedResource([this.room.nuker], RESOURCE_GHODIUM, CONSTANTS.PRIORITY.NUKER_GHODIUM);
    for (var need of nukerGhodiumNeeds) {
      this._addNeedsResource(need);
    }
  }
};

/**
 * Process factory that needs resources
 */
ControllerRoom.prototype._processFactoryNeeds = function () {
  var factory = this.room.factory;
  if (!factory || factory.store.getFreeCapacity() === 0) return;
  
  for (var resourceType of RESOURCES_ALL) {
    var fillLevel = this.room.getRoomThreshold(resourceType, "factory");
    var currentAmount = factory.store[resourceType] || 0;
    
    if (currentAmount < fillLevel) {
      var priority = resourceType === RESOURCE_ENERGY 
        ? CONSTANTS.PRIORITY.FACTORY_ENERGY 
        : CONSTANTS.PRIORITY.FACTORY_MINERAL;
      
      this._addNeedsResource({
        priority: priority,
        structureType: factory.structureType,
        resourceType: resourceType,
        amount: fillLevel - currentAmount,
        id: factory.id,
        exact: true,
      });
    }
  }
};

/**
 * Process storage that needs resources
 */
ControllerRoom.prototype._processStorageNeeds = function () {
  var storage = this.room.storage;
  if (!storage || storage.store.getFreeCapacity() === 0) return;
  
  for (var resourceType of RESOURCES_ALL) {
    var fillLevel = this.room.getRoomThreshold(resourceType, "storage");
    var currentAmount = ResourceManager.getResourceAmount(this.room, resourceType, "storage");
    var priority;
    var neededAmount;
    
    if (resourceType === RESOURCE_ENERGY) {
      if (currentAmount < fillLevel) {
        priority = CONSTANTS.PRIORITY.STORAGE_ENERGY_MID;
        neededAmount = fillLevel - currentAmount;
      } else if (currentAmount < CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD) {
        priority = CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW;
        neededAmount = CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD - currentAmount;
      } else {
        continue;
      }
    } else {
      // Minerals
      if (currentAmount < fillLevel) {
        priority = CONSTANTS.PRIORITY.STORAGE_MINERAL;
        neededAmount = fillLevel - currentAmount;
      } else {
        continue;
      }
    }
    
    this._addNeedsResource({
      priority: priority,
      structureType: storage.structureType,
      resourceType: resourceType,
      amount: neededAmount,
      id: storage.id,
      exact: true,
    });
  }
};

/**
 * Process terminal that needs resources
 */
ControllerRoom.prototype._processTerminalNeeds = function () {
  var terminal = this.room.terminal;
  if (!terminal || terminal.store.getFreeCapacity() === 0) return;
  
  var energyThreshold = this.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
  
  for (var resourceType of RESOURCES_ALL) {
    var currentAmount = ResourceManager.getResourceAmount(this.room, resourceType, "terminal");
    var priority;
    var neededAmount;
    
    if (resourceType === RESOURCE_ENERGY) {
      if (currentAmount < energyThreshold) {
        priority = CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW;
        neededAmount = energyThreshold - currentAmount;
      } else {
        priority = CONSTANTS.PRIORITY.TERMINAL_ENERGY_OVERFLOW;
        neededAmount = terminal.store.getFreeCapacity();
      }
    } else {
      // Minerals
      priority = CONSTANTS.PRIORITY.TERMINAL_MINERAL;
      neededAmount = terminal.store.getFreeCapacity();
    }
    
    this._addNeedsResource({
      priority: priority,
      structureType: terminal.structureType,
      resourceType: resourceType,
      amount: neededAmount,
      id: terminal.id,
      exact: true,
    });
  }
};

/**
 * Get all resources that are needed in this room
 * Returns sorted array by priority (lowest first)
 */
ControllerRoom.prototype.needsResources = function () {
  if (!this._needsResources) {
    this._needsResources = [];
    
    // Get controller priority
    var controllerPriority = this._getControllerPriority();
    
    // Process creeps and controller
    this._processUpgraders(controllerPriority);
    this._processController(controllerPriority);
    this._processConstructors();
    this._processLabsNeeds();
    
    // Process structures
    this._processStructures();
    
    // Process storage structures
    this._processFactoryNeeds();
    this._processStorageNeeds();
    this._processTerminalNeeds();
    
    // Sort by priority (lowest first = highest priority)
    this._needsResources.sort((a, b) => a.priority - b.priority);
  }
  
  return this._needsResources;
};

ControllerRoom.prototype.find = function (type) {
  if (!this._find[type]) {
    this._find[type] = this.room.find(type);
  }
  return this._find[type];
};

/**
 * ControllerRoom.getCreeps(role, target)
 * No Parameter = all Creeps
 * role = all Creeps with role
 * role + target = all Creeps with role + target
 */
ControllerRoom.prototype.getCreeps = function (role, target) {
  var creeps = this.find(FIND_MY_CREEPS);

  if (role || target) {
    var filter = {
      memory: {},
    };

    if (role) {
      filter.memory.role = role;
    }

    if (target) {
      filter.memory.target = target;
    }

    creeps = _.filter(creeps, filter);
  }

  return creeps;
};

// Also finds creeps that are spawning (getCreeps does not)
// Cached per tick - iterates Game.creeps only once
ControllerRoom.prototype.getAllCreeps = function (role) {
  // Build cache if not exists (once per tick per room)
  if (!this._creepsByRole) {
    // Use Object.create(null) to avoid prototype pollution (e.g. role named "constructor")
    this._creepsByRole = Object.create(null);
    this._creepsByRole._all = [];
    const room = this.room;
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (creep.room === room) {
        this._creepsByRole._all.push(creep);
        const creepRole = creep.memory.role;
        if (creepRole) {
          if (!this._creepsByRole[creepRole]) {
            this._creepsByRole[creepRole] = [];
          }
          this._creepsByRole[creepRole].push(creep);
        }
      }
    }
  }
  
  if (role) {
    return this._creepsByRole[role] || [];
  }
  return this._creepsByRole._all;
};

ControllerRoom.prototype.findNearLink = function (obj) {
  let allLinks = this.room.links;
  let thelink = obj.pos.findInRange(allLinks, 3);
  if (thelink.length > 0) {
    let link = thelink[0];
    return link;
  }
  return null;
};

ControllerRoom.prototype.getEnemys = function () {
  // Cache enemies for the current tick
  if (this._enemies !== undefined) {
    return this._enemies;
  }
  const allowedNameList = ["lur", "starwar15432", "leonyx", "lisp", "rubra", "thekraken", "apemanzilla", "iskillet", "Tada_", "xylist"];
  const allowedSet = new Set(allowedNameList); // O(1) lookup
  this._enemies = this.room.find(FIND_HOSTILE_CREEPS, {
    filter: (foundCreep) => !allowedSet.has(foundCreep.owner.username),
  });
  return this._enemies;
};

ControllerRoom.prototype.getLevel = function () {
  var controller = this.room.controller;
  if (controller && controller.my) {
    return controller.level;
  }
  return 0;
};

ControllerRoom.prototype.structureNeedResource = function (structure, resource) {
  if (structure) {
    return structure.store.getFreeCapacity(resource);
  } else {
    return null;
  }
};

ControllerRoom.prototype.structuresNeedResource = function (structures, resource, prio, threshold) {
  // Filter out null/undefined structures and those with enough resources
  const filtered = _.filter(structures, (s) => s && s.store && s.store.getFreeCapacity(resource) > (threshold || 0));

  return _.map(filtered, (s) => {
    return {
      priority: prio,
      structureType: s.structureType,
      resourceType: resource,
      amount: s.store.getFreeCapacity(resource),
      id: s.id,
    };
  });
};

ControllerRoom.prototype.getDroppedResourcesAmount = function () {
  let amount = 0;
  for (var s of this.find(FIND_DROPPED_RESOURCES)) {
    amount += s.amount;
  }
  return amount;
};

ControllerRoom.prototype.getControllerNotFull = function () {
  if (!this._controllerNF) {
    this._controllerNF = null;

    let controllerz = this.room.controller;
    if (controllerz) {
      let containerId = controllerz.memory.containerID || null;
      if (containerId != null) {
        var container = /** @type {StructureContainer | null} */ (Game.getObjectById(containerId));
        if (container != null) {
          if (container.store && container.store[RESOURCE_ENERGY] + CONSTANTS.RESOURCES.CONTROLLER_ENERGY_BUFFER < container.store.getCapacity(RESOURCE_ENERGY)) {
            this._controllerNF = container;
          }
        }
      }
    }
    return this._controllerNF;
  }
};

ControllerRoom.prototype.getIdleSpawn = function () {
  for (var i in this._spawns) {
    var sc = this._spawns[i];
    var idleSpawn = sc.isIdle();
    if (idleSpawn) {
      return sc;
    }
  }
  return null;
};

ControllerRoom.prototype.getIdleSpawnObject = function () {
  for (var i in this.room.spawns) {
    var sc = this.room.spawns[i];
    if (!sc.spawning) {
      return sc;
    }
  }
  return null;
};

ControllerRoom.prototype.getMineralAmount = function () {
  var minerals = this.find(FIND_MINERALS);
  return minerals[0].mineralAmount;
};

ControllerRoom.prototype.getSources = function () {
  if (!this._sources) {
    this._sources = this.find(FIND_SOURCES);
  }
  return this._sources;
};

ControllerRoom.prototype.getSourcesNotEmpty = function () {
  if (!this._sourcesNE) {
    let sources = this.getSources();
    if (sources) {
      this._sourcesNE = _.filter(sources, function (s) {
        // TODO Calculate free spaces around source
        return s.energy > 0;
      });
    } else {
      return null;
    }
  }
  return this._sourcesNE;
};

/* ControllerRoom.prototype.getSourcesUndefended = function (defended) {
	if (!this._sourcesUD) {
		let sources = this.getSources();
		if (sources) {
			this._sourcesUD = _.filter(sources, function (s) {
				return (defended || false) == s.defended;
			});
		} else {
			return null;
		}
	}
	return this._sourcesUD;
}; */

ControllerRoom.prototype.getFirstPossibleLabReaction = function () {
  for (var key in REACTIONS) {
    if (REACTIONS.hasOwnProperty(key)) {
      var obj = REACTIONS[key];
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          // TODO RESOURCES.LAB_REACTION_MIN should be dynamic based on number of labs, or complete new system
          if (
            this.room.getResourceAmount(key, "all") >= CONSTANTS.RESOURCES.LAB_REACTION_MIN &&
            this.room.getResourceAmount(prop, "all") >= CONSTANTS.RESOURCES.LAB_REACTION_MIN &&
            this.room.getResourceAmount(obj[prop], "all") < this.room.getRoomThreshold(obj[prop], "all")
          ) {
            return {
              resourceA: key,
              resourceB: prop,
              result: obj[prop],
            };
          }
        }
      }
    }
  }
};

ControllerRoom.prototype.findStructuresToRepair = function () {
  // Cache for current tick
  if (this._structuresToRepair !== undefined) {
    return this._structuresToRepair;
  }
  
  const structures = _.filter(this.find(FIND_STRUCTURES), (s) => s.needsRepair());
  this._structuresToRepair = _.sortBy(structures, (s) => s.hits);
  return this._structuresToRepair;
};

ControllerRoom.prototype._shouldCreateCreep = function (role, cfg) {
  var level = this.getLevel();
  var lReq = cfg.levelMin || 1;
  var lMax = cfg.levelMax || 10;
  if (level < lReq) return false;
  if (lMax < level) return false;
  if (cfg.wait4maxEnergy == true && this.room.energyCapacityAvailable > this.room.energyAvailable) return false;
  if (!cfg.canBuild) {
    Log.error(role + " : no canBuild() implemented", "ControllerRoom");
    return false;
  }

  return cfg.canBuild(this);
};

/**
 * Measures the time it takes to upgrade from one RCL level to the next
 * Stores upgrade times in Memory.rooms[roomName].rclUpgradeTimes
 * Format: { "1": 1234, "2": 2345, ... } where key is the level reached and value is ticks taken
 */
ControllerRoom.prototype.measureRclUpgradeTime = function () {
  // Only measure for owned rooms with controller
  if (!this.room.controller || !this.room.controller.my) {
    return;
  }

  const currentLevel = this.room.controller.level;
  const roomName = this.room.name;

  // Initialize memory structure if not exists
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[roomName]) {
    Memory.rooms[roomName] = {};
  }
  if (!Memory.rooms[roomName].rclUpgradeTimes) {
    Memory.rooms[roomName].rclUpgradeTimes = {};
  }
  if (Memory.rooms[roomName].rclUpgradeTimes.lastLevel === undefined) {
    Memory.rooms[roomName].rclUpgradeTimes.lastLevel = currentLevel;
  }
  if (Memory.rooms[roomName].rclUpgradeTimes.lastLevelTick === undefined) {
    Memory.rooms[roomName].rclUpgradeTimes.lastLevelTick = Game.time;
  }

  const lastLevel = Memory.rooms[roomName].rclUpgradeTimes.lastLevel;
  const lastLevelTick = Memory.rooms[roomName].rclUpgradeTimes.lastLevelTick;

  // Check if RCL level increased
  if (currentLevel > lastLevel) {
    // Calculate upgrade time for the previous level (time from lastLevel to currentLevel)
    const upgradeTime = Game.time - lastLevelTick;
    
    // Store upgrade time for the level we just reached
    // Key is the level reached (e.g., "2" means time from RCL 1 to RCL 2)
    Memory.rooms[roomName].rclUpgradeTimes[currentLevel.toString()] = upgradeTime;

    // Update tracking
    Memory.rooms[roomName].rclUpgradeTimes.lastLevel = currentLevel;
    Memory.rooms[roomName].rclUpgradeTimes.lastLevelTick = Game.time;
  } else if (currentLevel < lastLevel) {
    // Level decreased (shouldn't happen normally, but handle it)
    // Reset tracking
    Memory.rooms[roomName].rclUpgradeTimes.lastLevel = currentLevel;
    Memory.rooms[roomName].rclUpgradeTimes.lastLevelTick = Game.time;
  }
  // If level is the same, do nothing - tracking continues
};


module.exports = ControllerRoom;
