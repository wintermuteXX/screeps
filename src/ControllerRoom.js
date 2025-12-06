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

  // Nutze gecachten room.spawns Getter (filtert nach my)
  const spawns = this.room.spawns.filter(s => s.my);
  for (const s in spawns) {
    const spawn = spawns[s];
    this._spawns.push(new ControllerSpawn(spawn, this));
  }

  this.links = new ControllerLink(this);

  const towers = this.room.towers;

  for (const t in towers) {
    const tower = towers[t];
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

  if (this._hasCpuAvailable()) {
    if (this.room.powerSpawn && this.room.powerSpawn.store.energy > 0 && this.room.powerSpawn.store.power > 0) {
      this.room.powerSpawn.processPower();
    }
  }

  if (this._hasCpuAvailable()) {
    if (Game.time % CONSTANTS.TICKS.LAB_CHECK_STATUS === 0) {
      this.labs.checkStatus();
    }
  }
  if (this._hasCpuAvailable()) {
    this.labs.produce();
  }
  // Automatically assign factory levels (each level 1-5 only once)
  if (this.room.factory) {
    this.factory.assignLevel();
  }
  if (this._hasCpuAvailable(CONSTANTS.CPU.BUCKET_LOW)) {
    this.factory.produce();
  }
};

ControllerRoom.prototype.commandCreeps = function () {
  const cc = new ControllerCreep(this);
  const creeps = this.find(FIND_MY_CREEPS);

  for (const c in creeps) {
    cc.run(creeps[c]);
  }
};

ControllerRoom.prototype.populate = function () {
  if (Game.time % CONSTANTS.TICKS.CHECK_POPULATION !== 0) return;

  let spawn = null;

  const roles = global.getCreepRoles();
  const cfgCreeps = global.getCreepsConfig();

  if (spawn === null) spawn = this.getIdleSpawn();
  if (spawn === null) return;

  for (const i in roles) {
    const role = roles[i];

    const cfg = cfgCreeps[role];
    if (!cfg.produceGlobal || cfg.produceGlobal === false) {
      if (this._shouldCreateCreep(role, cfg)) {
        spawn.createCreep(role, cfg);
        return;
      }
    }
  }
};

ControllerRoom.prototype.getTransportOrder = function (Creep) {
  let givesResources = this.givesResources();
  let needsResources = this.needsResources();
  
  // Check if creep is empty
  const isEmpty = Creep.store.getUsedCapacity() === 0;
  
  // Only assign orders to empty creeps
  if (!isEmpty) {
    return null;
  }
  
  // Find first matching pair (same resourceType, different IDs)
  for (const g in givesResources) {
    const give = givesResources[g];
    for (const n in needsResources) {
      const need = needsResources[n];
      
      // Basic compatibility check
      if (give.resourceType !== need.resourceType) continue;
      if (need.id === give.id) continue;
      // Only block if an EMPTY creep is already targeting this source (empty creeps collect resources)
      if (this.getAllCreeps().some(c => c.memory.target === give.id && c.store.getUsedCapacity() === 0)) continue;
      
      // Check if target still exists and has capacity
      const targetValidation = this._validateResourceTarget(need.id, need.resourceType);
      if (!targetValidation) continue;
      
      // Found matching order - set orderType in memory and return
      give.orderType = "G";
      
      // Update Creep.memory.resources with orderType
      this._updateCreepResourceMemory(Creep, give.resourceType, give.id, "G", 0);
      
      return give;
    }
  }
  
  return null;
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
  
  // Find matching orders - collect all matches
  const matchingOrders = [];
  
  for (const resType of resourcesToCheck) {
    if (Creep.store[resType] <= 0) continue;
    
    for (const n in needsResources) {
      const need = needsResources[n];
      
      // Basic compatibility check
      if (need.resourceType !== resType) continue;
      if (need.id === Creep.id) continue;
      // Only block if a creep WITH RESOURCES is already targeting this destination (creeps with resources deliver)
      if (this.getAllCreeps().some(c => c.memory.target === need.id && c.store.getUsedCapacity() > 0)) continue;

      // Check if target still exists and has capacity
      const targetValidation = this._validateResourceTarget(need.id, resType);
      if (!targetValidation) continue;
      
      // Found matching order - set orderType and add to list
      need.orderType = "D";
      
      // Update Creep.memory.resources with orderType
      this._updateCreepResourceMemory(Creep, resType, need.id, "D", Creep.store[resType] || 0);
      
      matchingOrders.push(need);
    }
  }
  
  // Return format: if resourceType specified, return single order; otherwise return array
  if (matchingOrders.length > 0) {
    if (resourceType !== null) {
      // Specific resource type requested - return first matching order for this type
      const firstForType = matchingOrders.find(o => o.resourceType === resourceType);
      return firstForType || null;
    } else {
      // No specific resource type - return array of all matching orders
      return matchingOrders;
    }
  }
  
  return null;
};

/**
 * Helper function to check if CPU is available for optional operations
 * @param {number} [bucketThreshold] - Minimum CPU bucket required (default: BUCKET_MEDIUM)
 * @returns {boolean} True if CPU is available
 */
ControllerRoom.prototype._hasCpuAvailable = function (bucketThreshold) {
  // @ts-ignore - bucketThreshold is optional
  const threshold = bucketThreshold || CONSTANTS.CPU.BUCKET_MEDIUM;
  return Game.cpu.limit - Game.cpu.getUsed() > 0 && Game.cpu.bucket > threshold;
};

/**
 * Helper function to ensure Memory.rooms[roomName] exists
 * @returns {Object} Room memory object
 */
ControllerRoom.prototype._ensureRoomMemory = function () {
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[this.room.name]) {
    Memory.rooms[this.room.name] = {};
  }
  return Memory.rooms[this.room.name];
};

/**
 * Helper function to validate a resource target (exists and has capacity)
 * @param {string} targetId - Target object ID
 * @param {string} resourceType - Resource type to check
 * @returns {Object|null} { obj, freeCapacity } or null if invalid
 */
ControllerRoom.prototype._validateResourceTarget = function (targetId, resourceType) {
  const targetObj = Game.getObjectById(targetId);
  if (!targetObj) return null;
  
  // @ts-ignore - targetObj may have store property
  if (targetObj.store) {
    // @ts-ignore - store property exists on structures/creeps
    const freeCap = targetObj.store.getFreeCapacity(resourceType) || 0;
    if (freeCap <= 0) return null;
    return { obj: targetObj, freeCapacity: freeCap };
  }
  
  // No store (e.g., controller) - assume valid
  return { obj: targetObj, freeCapacity: Infinity };
};

/**
 * Helper function to update creep memory with resource information
 * @param {Creep} creep - The creep
 * @param {string} resourceType - Resource type
 * @param {string|null} targetId - Target object ID (optional)
 * @param {string} orderType - Order type ("G" or "D")
 * @param {number} amount - Amount (optional)
 */
ControllerRoom.prototype._updateCreepResourceMemory = function (creep, resourceType, targetId, orderType, amount) {
  if (!creep.memory.resources) {
    creep.memory.resources = [];
  }
  
  let resourceEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
  if (resourceEntry) {
    resourceEntry.orderType = orderType;
    if (targetId) resourceEntry.target = targetId;
    if (amount !== undefined) resourceEntry.amount = amount;
  } else {
    creep.memory.resources.push({
      resourceType: resourceType,
      amount: amount !== undefined ? amount : 0,
      target: targetId || null,
      orderType: orderType
    });
  }
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
  if (!this.room.controller) {
    return false;
  }
  return pos.inRangeTo(this.room.controller.pos, CONSTANTS.CONTROLLER.RANGE_FOR_DROPPED_RESOURCES);
};

/**
 * Helper function to get priority and amount for storage resources (gives)
 * @param {string} resourceType - Resource type
 * @param {number} amount - Current amount
 * @param {number} fillLevel - Fill level threshold
 * @returns {Object|null} { priority, amount } or null if should skip
 */
ControllerRoom.prototype._getStorageGivesPriority = function (resourceType, amount, fillLevel) {
  if (resourceType === RESOURCE_ENERGY) {
    if (amount <= fillLevel) {
      return {
        priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_LOW,
        amount: amount
      };
    } else {
      return {
        priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW,
        amount: amount - fillLevel
      };
    }
  } else {
    // Minerals
    if (amount > fillLevel) {
      return {
        priority: CONSTANTS.PRIORITY.STORAGE_MINERAL_OVERFLOW,
        amount: amount - fillLevel
      };
    } else {
      return {
        priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH,
        amount: amount
      };
    }
  }
};

/**
 * Helper function to get priority and amount for storage needs
 * @param {string} resourceType - Resource type
 * @param {number} currentAmount - Current amount
 * @param {number} fillLevel - Fill level threshold
 * @returns {Object|null} { priority, amount } or null if should skip
 */
ControllerRoom.prototype._getStorageNeedsPriority = function (resourceType, currentAmount, fillLevel) {
  if (resourceType === RESOURCE_ENERGY) {
    if (currentAmount < fillLevel) {
      return {
        priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_MID,
        amount: fillLevel - currentAmount
      };
    } else if (currentAmount < CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD) {
      return {
        priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW,
        amount: CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD - currentAmount
      };
    }
    return null; // Skip if already at max
  } else {
    // Minerals
    if (currentAmount < fillLevel) {
      return {
        priority: CONSTANTS.PRIORITY.STORAGE_MINERAL,
        amount: fillLevel - currentAmount
      };
    }
    return null; // Skip if already at fill level
  }
};

/**
 * Helper function to get priority and amount for terminal resources (gives)
 * @param {string} resourceType - Resource type
 * @param {number} amount - Current amount
 * @param {number} energyThreshold - Energy threshold
 * @returns {Object|null} { priority, amount } or null if should skip
 */
ControllerRoom.prototype._getTerminalGivesPriority = function (resourceType, amount, energyThreshold) {
  if (resourceType === RESOURCE_ENERGY) {
    if (amount <= energyThreshold) {
      return {
        priority: CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW,
        amount: amount
      };
    } else {
      return {
        priority: CONSTANTS.PRIORITY.TERMINAL_ENERGY_HIGH,
        amount: amount - energyThreshold
      };
    }
  } else {
    // Minerals
    if (amount > 0) {
      return {
        priority: CONSTANTS.PRIORITY.TERMINAL_MINERAL,
        amount: amount
      };
    }
    return null; // Skip if no minerals
  }
};

/**
 * Process store-based resources (tombstones, ruins, etc.)
 * @param {number} findType - FIND_TOMBSTONES or FIND_RUINS
 * @param {number} minAmount - Minimum amount threshold
 * @param {number} priority - Priority constant
 * @param {string} defaultStructureType - Default structure type if not found
 */
ControllerRoom.prototype._processStoreResources = function (findType, minAmount, priority, defaultStructureType) {
  this.find(findType).forEach((item) => {
    for (const resourceType in item.store) {
      const amount = item.store[resourceType];
      if (amount > minAmount) {
        const structureType = item.structureType || 
                            (item.structure ? item.structure.structureType : defaultStructureType);
        this._addGivesResource({
          priority: priority,
          resourceType: resourceType,
          structureType: structureType,
          amount: amount,
          id: item.id,
        });
      }
    }
  });
};

/**
 * Process tombstones that can give resources
 */
ControllerRoom.prototype._processTombstones = function () {
  this._processStoreResources(
    FIND_TOMBSTONES,
    CONSTANTS.RESOURCES.TOMBSTONE_MIN,
    CONSTANTS.PRIORITY.TOMBSTONE,
    "tombstone"
  );
};

/**
 * Process ruins that can give resources
 * Ruins contain resources from destroyed structures
 */
ControllerRoom.prototype._processRuins = function () {
  this._processStoreResources(
    FIND_RUINS,
    0,
    CONSTANTS.PRIORITY.RUIN,
    "ruin"
  );
};

/**
 * Process links that can give energy
 */
ControllerRoom.prototype._processLinks = function () {
  if (!this.links.receivers) return;
  
  for (const link of this.links.receivers) {
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
  for (const resource of this.find(FIND_DROPPED_RESOURCES)) {
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
  const containers = [];
  
  // Get containers from sources (nutzt gecachten find() Cache)
  const sources = this.find(FIND_SOURCES);
  for (const source of sources) {
    if (source && source.container) {
      containers.push(source.container);
    }
  }
  
  // Get container from extractor
  if (this.room.extractor && this.room.extractor.container) {
    containers.push(this.room.extractor.container);
  }
  
  for (const container of containers) {
    if (!container || !container.store) continue;
    
    for (const resourceType in container.store) {
      const amount = container.store[resourceType];
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
  
  for (const lab of this.room.labs) {
    if (!lab.memory || lab.memory.status !== "empty") continue;
    
    const result = lab.getFirstMineral();
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
  const factory = this.room.factory;
  if (!factory) return;
  
  for (const resourceType of RESOURCES_ALL) {
    const fillLevel = this.room.getRoomThreshold(resourceType, "factory");
    const amount = ResourceManager.getResourceAmount(this.room, resourceType, "factory");
    
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
  const storage = this.room.storage;
  if (!storage) return;
  
  for (const resourceType of RESOURCES_ALL) {
    const amount = ResourceManager.getResourceAmount(this.room, resourceType, "storage");
    if (amount === 0) continue;
    
    const fillLevel = this.room.getRoomThreshold(resourceType, "storage");
    const priorityInfo = this._getStorageGivesPriority(resourceType, amount, fillLevel);
    
    if (priorityInfo) {
      this._addGivesResource({
        priority: priorityInfo.priority,
        structureType: storage.structureType,
        resourceType: resourceType,
        amount: priorityInfo.amount,
        id: storage.id,
        exact: true,
      });
    }
  }
};

/**
 * Process terminal resources
 */
ControllerRoom.prototype._processTerminal = function () {
  const terminal = this.room.terminal;
  if (!terminal) return;
  
  const energyThreshold = this.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
  
  for (const resourceType of RESOURCES_ALL) {
    const amount = ResourceManager.getResourceAmount(this.room, resourceType, "terminal");
    const priorityInfo = this._getTerminalGivesPriority(resourceType, amount, energyThreshold);
    
    if (priorityInfo) {
      this._addGivesResource({
        priority: priorityInfo.priority,
        structureType: terminal.structureType,
        resourceType: resourceType,
        amount: priorityInfo.amount,
        id: terminal.id,
      });
    }
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
  
  const ticksToDowngrade = this.room.controller.ticksToDowngrade;
  if (ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_CRITICAL) {
    return CONSTANTS.PRIORITY.CONTROLLER_CRITICAL;
  } else if (ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_LOW) {
    return CONSTANTS.PRIORITY.CONTROLLER_LOW;
  }
  
  return CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
};

/**
 * Process upgrader creeps that need energy (when no container at controller)
 */
ControllerRoom.prototype._processUpgraders = function (priority) {
  if (!this.room.controller || this.room.controller.container) return;
  
  const upgraders = this.getCreeps("upgrader");
  for (const upgrader of upgraders) {
    const freeCapacity = upgrader.store.getFreeCapacity(RESOURCE_ENERGY);
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
  const controllerContainer = this.getControllerNotFull();
  if (controllerContainer) {
    const freeCapacity = controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY);
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
  const constructors = this.getCreeps("constructor");
  for (const constructor of constructors) {
    const freeCapacity = constructor.store.getFreeCapacity(RESOURCE_ENERGY);
    const capacity = constructor.store.getCapacity();
    
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
  
  for (const lab of this.room.labs) {
    if (!lab.memory || lab.memory.status !== "fill" || !lab.memory.usedBy) continue;
    
    const resourceType = lab.memory.resource;
    if (!resourceType) continue;
    
    const freeCapacity = lab.store.getFreeCapacity(resourceType);
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
  const towerPriority = this.getEnemys().length > 0 
    ? CONSTANTS.PRIORITY.TOWER_ENEMY 
    : CONSTANTS.PRIORITY.TOWER_NORMAL;
  
  // Process towers
  const towerNeeds = this.structuresNeedResource(this.room.towers, RESOURCE_ENERGY, towerPriority, 400);
  for (const need of towerNeeds) {
    this._addNeedsResource(need);
  }
  
  // Process spawns
  const spawnNeeds = this.structuresNeedResource(this.room.spawns, RESOURCE_ENERGY, CONSTANTS.PRIORITY.SPAWN);
  for (const need of spawnNeeds) {
    this._addNeedsResource(need);
  }
  
  // Process extensions
  const extensionNeeds = this.structuresNeedResource(this.room.extensions, RESOURCE_ENERGY, CONSTANTS.PRIORITY.EXTENSION);
  for (const need of extensionNeeds) {
    this._addNeedsResource(need);
  }
  
  // Process labs (for energy)
  const labNeeds = this.structuresNeedResource(this.room.labs, RESOURCE_ENERGY, CONSTANTS.PRIORITY.LAB);
  for (const need of labNeeds) {
    this._addNeedsResource(need);
  }
  
  // Process power spawn
  if (this.room.powerSpawn) {
    const powerSpawnEnergyNeeds = this.structuresNeedResource([this.room.powerSpawn], RESOURCE_ENERGY, CONSTANTS.PRIORITY.POWER_SPAWN_ENERGY, 400);
    for (const need of powerSpawnEnergyNeeds) {
      this._addNeedsResource(need);
    }
    
    const powerSpawnPowerNeeds = this.structuresNeedResource([this.room.powerSpawn], RESOURCE_POWER, CONSTANTS.PRIORITY.POWER_SPAWN_POWER, 90);
    for (const need of powerSpawnPowerNeeds) {
      this._addNeedsResource(need);
    }
  }
  
  // Process nuker
  if (this.room.nuker) {
    const nukerEnergyNeeds = this.structuresNeedResource([this.room.nuker], RESOURCE_ENERGY, CONSTANTS.PRIORITY.NUKER_ENERGY);
    for (const need of nukerEnergyNeeds) {
      this._addNeedsResource(need);
    }
    
    const nukerGhodiumNeeds = this.structuresNeedResource([this.room.nuker], RESOURCE_GHODIUM, CONSTANTS.PRIORITY.NUKER_GHODIUM);
    for (const need of nukerGhodiumNeeds) {
      this._addNeedsResource(need);
    }
  }
};

/**
 * Process factory that needs resources
 */
ControllerRoom.prototype._processFactoryNeeds = function () {
  const factory = this.room.factory;
  if (!factory || factory.store.getFreeCapacity() === 0) return;
  
  for (const resourceType of RESOURCES_ALL) {
    const fillLevel = this.room.getRoomThreshold(resourceType, "factory");
    const currentAmount = factory.store[resourceType] || 0;
    
    if (currentAmount < fillLevel) {
      const priority = resourceType === RESOURCE_ENERGY 
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
  const storage = this.room.storage;
  if (!storage || storage.store.getFreeCapacity() === 0) return;
  
  for (const resourceType of RESOURCES_ALL) {
    const fillLevel = this.room.getRoomThreshold(resourceType, "storage");
    const currentAmount = ResourceManager.getResourceAmount(this.room, resourceType, "storage");
    const priorityInfo = this._getStorageNeedsPriority(resourceType, currentAmount, fillLevel);
    
    if (priorityInfo) {
      this._addNeedsResource({
        priority: priorityInfo.priority,
        structureType: storage.structureType,
        resourceType: resourceType,
        amount: priorityInfo.amount,
        id: storage.id,
        exact: true,
      });
    }
  }
};

/**
 * Process terminal that needs resources
 */
ControllerRoom.prototype._processTerminalNeeds = function () {
  const terminal = this.room.terminal;
  if (!terminal || terminal.store.getFreeCapacity() === 0) return;
  
  const energyThreshold = this.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
  const freeCapacity = terminal.store.getFreeCapacity();
  
  for (const resourceType of RESOURCES_ALL) {
    const currentAmount = ResourceManager.getResourceAmount(this.room, resourceType, "terminal");
    let priority;
    let neededAmount;
    
    if (resourceType === RESOURCE_ENERGY) {
      if (currentAmount < energyThreshold) {
        priority = CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW;
        neededAmount = Math.min(energyThreshold - currentAmount, freeCapacity);
      } else {
        // Only add overflow need if there's actually free capacity
        if (freeCapacity > 0) {
          priority = CONSTANTS.PRIORITY.TERMINAL_ENERGY_OVERFLOW;
          neededAmount = freeCapacity;
        } else {
          continue; // Skip if no free capacity
        }
      }
    } else {
      // Minerals - only add need if terminal has free capacity and we actually need this mineral
      // Skip if terminal is full or if we don't need this specific mineral
      if (freeCapacity <= 0) {
        continue;
      }
      // Only add mineral need if we're below fill level or terminal is empty
      const fillLevel = this.room.getRoomThreshold(resourceType, "terminal");
      if (currentAmount < fillLevel || currentAmount === 0) {
        priority = CONSTANTS.PRIORITY.TERMINAL_MINERAL;
        neededAmount = Math.min(fillLevel - currentAmount, freeCapacity);
      } else {
        continue; // Skip if already at fill level
      }
    }
    
    // Only add if we actually need something
    if (neededAmount > 0) {
      this._addNeedsResource({
        priority: priority,
        structureType: terminal.structureType,
        resourceType: resourceType,
        amount: neededAmount,
        id: terminal.id,
        exact: true,
      });
    }
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
    const controllerPriority = this._getControllerPriority();
    
    this._processUpgraders(controllerPriority);
    this._processController(controllerPriority);
    this._processConstructors();
    this._processLabsNeeds();
    this._processStructures();
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
  let creeps = this.find(FIND_MY_CREEPS);

  if (role || target) {
    const filter = {
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
  const allLinks = this.room.links;
  const thelink = obj.pos.findInRange(allLinks, 3);
  if (thelink.length > 0) {
    return thelink[0];
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
  const controller = this.room.controller;
  if (controller && controller.my) {
    return controller.level;
  }
  return 0;
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
  for (const s of this.find(FIND_DROPPED_RESOURCES)) {
    amount += s.amount;
  }
  return amount;
};

ControllerRoom.prototype.getControllerNotFull = function () {
  if (this._controllerNF === undefined) {
    this._controllerNF = null;

    const controllerz = this.room.controller;
    if (controllerz) {
      const containerId = controllerz.memory.containerID || null;
      if (containerId != null) {
        const container = /** @type {StructureContainer | null} */ (Game.getObjectById(containerId));
        if (container != null) {
          if (container.store && container.store[RESOURCE_ENERGY] + CONSTANTS.RESOURCES.CONTROLLER_ENERGY_BUFFER < container.store.getCapacity(RESOURCE_ENERGY)) {
            this._controllerNF = container;
          }
        }
      }
    }
  }
  return this._controllerNF;
};

ControllerRoom.prototype.getIdleSpawn = function () {
  for (const i in this._spawns) {
    const sc = this._spawns[i];
    if (sc.isIdle()) {
      return sc;
    }
  }
  return null;
};

ControllerRoom.prototype.getIdleSpawnObject = function () {
  // Nutze gecachten room.spawns Getter (filtert nach my)
  const spawns = this.room.spawns.filter(s => s.my);
  for (const i in spawns) {
    const sc = spawns[i];
    if (!sc.spawning) {
      return sc;
    }
  }
  return null;
};

ControllerRoom.prototype.getMineralAmount = function () {
  const minerals = this.find(FIND_MINERALS);
  if (!minerals || minerals.length === 0) {
    return 0;
  }
  return minerals[0].mineralAmount;
};

ControllerRoom.prototype.getSourcesNotEmpty = function () {
  if (!this._sourcesNE) {
    // Nutzt gecachten find() Cache statt getSources()
    const sources = this.find(FIND_SOURCES);
    if (sources && sources.length > 0) {
      this._sourcesNE = _.filter(sources, function (s) {
        return s.energy > 0;
      });
    } else {
      this._sourcesNE = [];
    }
  }
  return this._sourcesNE;
};

ControllerRoom.prototype.getFirstPossibleLabReaction = function () {
  for (const key in REACTIONS) {
    if (REACTIONS.hasOwnProperty(key)) {
      const obj = REACTIONS[key];
      for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
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
  const level = this.getLevel();
  const lReq = cfg.levelMin || 1;
  const lMax = cfg.levelMax || 10;
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
  const roomMemory = this._ensureRoomMemory();
  
  // Initialize rclUpgradeTimes if not exists
  if (!roomMemory.rclUpgradeTimes) {
    roomMemory.rclUpgradeTimes = {};
  }
  if (roomMemory.rclUpgradeTimes.lastLevel === undefined) {
    roomMemory.rclUpgradeTimes.lastLevel = currentLevel;
  }
  if (roomMemory.rclUpgradeTimes.lastLevelTick === undefined) {
    roomMemory.rclUpgradeTimes.lastLevelTick = Game.time;
  }

  const lastLevel = roomMemory.rclUpgradeTimes.lastLevel;
  const lastLevelTick = roomMemory.rclUpgradeTimes.lastLevelTick;

  // Check if RCL level increased
  if (currentLevel > lastLevel) {
    // Calculate upgrade time for the previous level (time from lastLevel to currentLevel)
    const upgradeTime = Game.time - lastLevelTick;
    
    // Store upgrade time for the level we just reached
    // Key is the level reached (e.g., "2" means time from RCL 1 to RCL 2)
    roomMemory.rclUpgradeTimes[currentLevel.toString()] = upgradeTime;

    // Update tracking
    roomMemory.rclUpgradeTimes.lastLevel = currentLevel;
    roomMemory.rclUpgradeTimes.lastLevelTick = Game.time;
  } else if (currentLevel < lastLevel) {
    // Level decreased (shouldn't happen normally, but handle it)
    // Reset tracking
    roomMemory.rclUpgradeTimes.lastLevel = currentLevel;
    roomMemory.rclUpgradeTimes.lastLevelTick = Game.time;
  }
  // If level is the same, do nothing - tracking continues
};


module.exports = ControllerRoom;
