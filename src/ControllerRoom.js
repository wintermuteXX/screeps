var ControllerSpawn = require("ControllerSpawn");
var ControllerCreep = require("ControllerCreep");
var ControllerLink = require("ControllerLink");
var ControllerTower = require("ControllerTower");
var ControllerTerminal = require("ControllerTerminal");
var ControllerFactory = require("ControllerFactory");
var ControllerLab = require("ControllerLab");
var RoomPlanner = require("RoomPlanner");
var LogisticsGroup = require("LogisticsGroup");
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
  
  // Initialize LogisticsGroup (neues Logistiksystem)
  this.logisticsGroup = null;
  if (CONSTANTS.LOGISTICS && CONSTANTS.LOGISTICS.ENABLED !== false) {
    this.logisticsGroup = new LogisticsGroup(this.room);
  }
}

ControllerRoom.prototype.run = function () {
  
  this.populate();

  // Run RoomPlanner (every 50 ticks to save CPU)
  if (Game.time % CONSTANTS.TICKS.ROOM_PLANNER === 0) {
    this.planner.run();
  }

  this.links.transferEnergy();

  // Update LogisticsGroup (neues Logistiksystem)
  if (this.logisticsGroup) {
    this.updateLogisticsGroup();
  }

  this.commandCreeps();

  // Tower operations - fire always, repair based on energy level
  const hasEnoughEnergy = this.room.getResourceAmount(RESOURCE_ENERGY, "all") > global.getRoomThreshold(RESOURCE_ENERGY, "all");
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

  for (var g in givesResources) {
    let give = givesResources[g];
    for (var n in needsResources) {
      let need = needsResources[n];
      // TODO getCreeps needs to be better. Should calculate if more amount is needed...
      if (
        give.resourceType === need.resourceType &&
        give.priority > need.priority &&
        need.id !== give.id &&
        (this.getCreeps(null, give.id).length == 0 || need.id == Creep.room.controller.memory.containerID)
      ) {
        Log.debug(
          `${this.room.name} ${need.structureType} (${need.priority}) needs ${_.min([need.amount, give.amount])} ${global.resourceImg(need.resourceType)} from ${give.structureType} (${
            give.priority
          }) which has ${give.amount}`,
          "getTransportOrder"
        );
        return give;
      }
    }
  }
  return null;
};

ControllerRoom.prototype.getDeliveryOrder = function (Creep) {
  let needsResources = this.needsResources();

  for (var n in needsResources) {
    let need = needsResources[n];
    if (need.resourceType === Creep.memory.resourceType && (this.getCreeps(null, need.id).length == 0 || need.id == Creep.room.controller.memory.containerID)) {
      Log.debug(`${this.room.name} ${Creep.name} transports ${_.min([Creep.amount, need.amount])} ${global.resourceImg(need.resourceType)} to ${need.structureType}`, "getDeliveryOrder");
      return need;
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
    var fillLevel = global.getRoomThreshold(resourceType, "factory");
    var amount = factory.store[resourceType] || 0;
    
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
    var amount = storage.store[resourceType] || 0;
    if (amount === 0) continue;
    
    var fillLevel = global.getRoomThreshold(resourceType, "storage");
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
  
  var energyThreshold = global.getRoomThreshold(RESOURCE_ENERGY, "terminal");
  
  for (var resourceType of RESOURCES_ALL) {
    var amount = terminal.store[resourceType] || 0;
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
    var fillLevel = global.getRoomThreshold(resourceType, "factory");
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
    var fillLevel = global.getRoomThreshold(resourceType, "storage");
    var currentAmount = storage.store[resourceType] || 0;
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
  
  var energyThreshold = global.getRoomThreshold(RESOURCE_ENERGY, "terminal");
  
  for (var resourceType of RESOURCES_ALL) {
    var currentAmount = terminal.store[resourceType] || 0;
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
            this.room.getResourceAmount(obj[prop], "all") < global.getRoomThreshold(obj[prop], "all")
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
 * Updates the LogisticsGroup system
 * Converts givesResources() and needsResources() to requests
 */
ControllerRoom.prototype.updateLogisticsGroup = function () {
  if (!this.logisticsGroup) return;
  
  // Register all transporters
  const transporters = this.getAllCreeps("transporter");
  for (const transporter of transporters) {
    this.logisticsGroup.registerTransporter(transporter);
  }
  
  // Remove transporters that no longer exist
  const activeTransporterIds = transporters.map((t) => t.id);
  const transportersToRemove = [];
  for (const transporter of this.logisticsGroup.transporters) {
    if (!activeTransporterIds.includes(transporter.id)) {
      transportersToRemove.push(transporter.id);
    }
  }
  for (const transporterId of transportersToRemove) {
    this.logisticsGroup.unregisterTransporter(transporterId);
  }
  
  // Collect current request IDs
  const currentRequestIds = new Set();
  
  // Convert givesResources() to provide() requests
  const givesResources = this.givesResources();
  let provideCount = 0;
  for (const give of givesResources) {
    const target = Game.getObjectById(give.id);
    if (!target || give.amount <= 0) continue;
    
    const requestId = `provide_${give.id}_${give.resourceType}`;
    currentRequestIds.add(requestId);
    
    // Calculate dAmountdt based on type
    let dAmountdt = 0;
    if (give.structureType === STRUCTURE_CONTAINER) {
      // Containers are filled by miners
      dAmountdt = 10; // Estimate: ~10 per tick
    } else if (give.structureType === STRUCTURE_LINK) {
      // Links are filled by senders
      dAmountdt = 0; // Manually transferred
    }
    
    // Check if resource is actually available
    let availableAmount = 0;
    if (target.store) {
      availableAmount = target.store[give.resourceType] || 0;
    } else if (target.amount !== undefined) {
      // Dropped Resource
      availableAmount = target.amount;
    }
    
    if (availableAmount > 0) {
      this.logisticsGroup.provide({
        target: target,
        resourceType: give.resourceType,
        amount: Math.min(give.amount, availableAmount),
        dAmountdt: dAmountdt,
        multiplier: 1,
        id: requestId,
      });
      provideCount++;
    }
  }
  
  // Convert needsResources() to request() requests
  const needsResources = this.needsResources();
  let requestCount = 0;
  for (const need of needsResources) {
    const target = Game.getObjectById(need.id);
    if (!target || need.amount <= 0) continue;
    
    // Check if target actually needs resource
    let neededAmount = 0;
    if (target.store) {
      neededAmount = target.store.getFreeCapacity(need.resourceType) || 0;
    } else if (target instanceof Creep) {
      neededAmount = target.store.getFreeCapacity(need.resourceType) || 0;
    }
    
    if (neededAmount <= 0) continue;
    
    const requestId = `request_${need.id}_${need.resourceType}`;
    currentRequestIds.add(requestId);
    
    // Calculate dAmountdt based on type
    let dAmountdt = 0;
    if (need.structureType === STRUCTURE_TOWER) {
      // Towers consume energy when shooting
      const enemies = this.getEnemys();
      dAmountdt = enemies.length > 0 ? -1 : 0; // Estimate: ~1 per tick when active
    } else if (need.structureType === STRUCTURE_SPAWN || need.structureType === STRUCTURE_EXTENSION) {
      // Spawns/Extensions consume when spawning
      dAmountdt = 0; // Consumed when spawning
    } else if (need.structureType === STRUCTURE_CONTROLLER) {
      // Controller consumes when upgrading
      const upgraders = this.getCreeps("upgrader");
      dAmountdt = -upgraders.length * 2; // Estimate: ~2 per upgrader
    }
    
    this.logisticsGroup.request({
      target: target,
      resourceType: need.resourceType,
      amount: Math.min(need.amount, neededAmount),
      dAmountdt: dAmountdt,
      multiplier: 1 / (need.priority || 100), // Lower priority = higher multiplier
      id: requestId,
    });
    requestCount++;
  }
  
  // Remove old requests that no longer exist
  const requestsToRemove = [];
  for (const request of this.logisticsGroup.requests) {
    if (!currentRequestIds.has(request.id)) {
      requestsToRemove.push(request.id);
    }
  }
  for (const requestId of requestsToRemove) {
    this.logisticsGroup.removeRequest(requestId);
  }
  
  // Run matching (only when needed, handled internally)
  this.logisticsGroup.runMatching();
};

/**
 * Initializes the LogisticsGroup system (if not already done)
 */
ControllerRoom.prototype.initLogisticsGroup = function () {
  if (!this.logisticsGroup && CONSTANTS.LOGISTICS && CONSTANTS.LOGISTICS.ENABLED !== false) {
    this.logisticsGroup = new LogisticsGroup(this.room);
  }
  return this.logisticsGroup;
};

module.exports = ControllerRoom;
