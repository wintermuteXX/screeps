var ControllerSpawn = require("ControllerSpawn");
var ControllerCreep = require("ControllerCreep");
var ControllerLink = require("ControllerLink");
var ControllerTower = require("ControllerTower");
var ControllerTerminal = require("ControllerTerminal");
var ControllerFactory = require("ControllerFactory");
var ControllerLab = require("ControllerLab");
const CONSTANTS = require("constants");

function ControllerRoom(room, ControllerGame) {
  this.room = room;
  this._find = {};
  this._spawns = [];
  this._towers = [];

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
}

ControllerRoom.prototype.run = function () {
  this.analyse();

  this.populate();

  this.links.transferEnergy();

  this.commandCreeps();

  // Tower operations - fire always, repair based on energy level
  const hasEnoughEnergy = this.room.getResourceAmount(RESOURCE_ENERGY, "all") > global.getRoomThreshold(RESOURCE_ENERGY, "all");
  const shouldRepair = hasEnoughEnergy || (Game.time % CONSTANTS.TICKS.REPAIR_TOWER === 0 && !(this.getLevel() === 8 && Math.random() >= 0.5));
  
  for (const tower of this._towers) {
    tower.fire();
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
  // this.labs.findLabPartner();
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

ControllerRoom.prototype.givesResources = function () {
  const self = this;

  if (!this._givesResources) {
    this._givesResources = [];

    let prio = CONSTANTS.PRIORITY.STORAGE_ENERGY_MID;

    this.find(FIND_TOMBSTONES).forEach((tombstone) => {
      _.each(tombstone.store, function (amount, resourceType) {
        if (amount > CONSTANTS.RESOURCES.TOMBSTONE_MIN) {
          self._givesResources.push({
            priority: CONSTANTS.PRIORITY.TOMBSTONE,
            resourceType: resourceType,
            structureType: tombstone.structureType,
            amount: amount,
            id: tombstone.id,
          });
        }
      });
    });

    // Links
    for (var l of _.filter(this.links.receivers, function (l) {
      return l.energy > 0 && !l.pos.inRangeTo(l.room.controller.pos, CONSTANTS.CONTROLLER.RANGE_FOR_DROPPED_RESOURCES);
    })) {
      self._givesResources.push({
        priority: CONSTANTS.PRIORITY.LINK,
        resourceType: "energy",
        structureType: l.structureType,
        amount: l.energy,
        id: l.id,
      });
    }

    // Dropped Resources
    for (var s of this.find(FIND_DROPPED_RESOURCES)) {
      if (s.amount > CONSTANTS.RESOURCES.DROPPED_MIN && !s.pos.inRangeTo(this.room.controller.pos, CONSTANTS.CONTROLLER.RANGE_FOR_DROPPED_RESOURCES)) {
        self._givesResources.push({
          priority: CONSTANTS.PRIORITY.DROPPED_RESOURCE,
          resourceType: s.resourceType,
          amount: s.amount,
          id: s.id,
        });
      }
    }

    // Containers
    var containers = [];
    var sources = this.getSources();
    for (var s of sources) {
      if (s && s.container) {
        containers.push(s.container);
      }
    }

    if (this.room.extractor && this.room.extractor.container) {
      containers.push(this.room.extractor.container);
    }

    _.each(containers, function (c) {
      if (c && c.store && c.store !== undefined) {
        _.each(c.store, function (amount, resourceType) {
          if (amount > CONSTANTS.RESOURCES.CONTAINER_MIN) {
            self._givesResources.push({
              priority: CONSTANTS.PRIORITY.CONTAINER,
              resourceType: resourceType,
              structureType: c.structureType,
              amount: amount,
              id: c.id,
            });
          }
        });
      }
    });

    // Labs
    _.forEach(this.room.labs, function (c) {
      let result = c.getFirstMineral();
      if (c && c.memory.resource && c.memory.status == "empty" && result && result["amount"] > 0) {
        self._givesResources.push({
          priority: 185,
          resourceType: result["resource"],
          structureType: c.structureType,
          amount: result["amount"],
          id: c.id,
        });
      }
    });

    let fac = this.room.factory;
    if (fac) {
      for (var a of RESOURCES_ALL) {
        let fillLevel = global.getRoomThreshold(a, "factory");
        if ((fac.store[a] || 0) > fillLevel) {
          prio = CONSTANTS.PRIORITY.FACTORY_OVERFLOW;

          self._givesResources.push({
            priority: prio,
            structureType: fac.structureType,
            resourceType: a,
            amount: (fac.store[a] || 0) - fillLevel,
            id: fac.id,
            exact: true,
          });
        }
      }
    }

    let sto = this.room.storage;
    let ter = this.room.terminal;

    if (sto) {
      for (var r of RESOURCES_ALL) {
        // Energy
        let amount = 0;
        let fillLevel = global.getRoomThreshold(r, "storage");
        if (r === "energy" && sto.store[r] <= fillLevel) {
          prio = CONSTANTS.PRIORITY.STORAGE_ENERGY_LOW;
          amount = sto.store[r];
        } else if (r === "energy" && sto.store[r] > fillLevel) {
          prio = CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW;
          amount = sto.store[r] - fillLevel;
        } else {
          // Minerals
          if (sto.store[r] > fillLevel) {
            prio = CONSTANTS.PRIORITY.STORAGE_MINERAL_OVERFLOW;
            amount = sto.store[r] - fillLevel;
          } else {
            prio = CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
            amount = sto.store[r];
          }
        }

        if (sto.store[r] > 0) {
          self._givesResources.push({
            priority: prio,
            structureType: sto.structureType,
            resourceType: r,
            amount: amount,
            id: sto.id,
            exact: true,
          });
        }
      }
    }

    if (ter) {
      for (var r of RESOURCES_ALL) {
        let amount = 0;
        if (r === "energy" && ter.store[r] <= global.getRoomThreshold(RESOURCE_ENERGY, "terminal")) {
          prio = CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW;
          amount = ter.store[r];
        } else if (r === "energy" && ter.store[r] > global.getRoomThreshold(RESOURCE_ENERGY, "terminal")) {
          prio = CONSTANTS.PRIORITY.TERMINAL_ENERGY_HIGH;
          amount = ter.store[r] - global.getRoomThreshold(RESOURCE_ENERGY, "terminal");
        } else if (r !== "energy" && ter.store[r] > 0) {
          prio = CONSTANTS.PRIORITY.TERMINAL_MINERAL;
          amount = ter.store[r];
        } else {
          continue;
        }

        self._givesResources.push({
          priority: prio,
          structureType: ter.structureType,
          resourceType: r,
          amount: amount,
          id: ter.id,
        });
      }
    }
    this._givesResources.sort((a, b) => {
      return b.priority - a.priority;
    });
  }
  return this._givesResources;
};

ControllerRoom.prototype.needsResources = function () {
  const self = this;
  if (!this._needsResources) {
    this._needsResources = [];

    let prio = CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
    if (this.room.controller && this.room.controller.ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_CRITICAL) {
      prio = CONSTANTS.PRIORITY.CONTROLLER_CRITICAL;
    } else if (this.room.controller && this.room.controller.ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_LOW) {
      prio = CONSTANTS.PRIORITY.CONTROLLER_LOW;
    }
    //	Fill Upgrader directly, if no container in position
    if (this.room.controller && !this.room.controller.container) {
      let upgrader = this.getCreeps("upgrader");
      for (var u of upgrader) {
        self._needsResources.push({
          priority: prio,
          resourceType: "energy",
          amount: u.store.getFreeCapacity(RESOURCE_ENERGY),
          id: u.id,
        });
      }
    }

    let con = this.getControllerNotFull();
    if (con && con != null) {
      self._needsResources.push({
        priority: prio,
        structureType: con.structureType,
        resourceType: "energy",
        amount: con.store.getFreeCapacity(RESOURCE_ENERGY),
        id: con.id,
      });
    }

    let constructor = this.getCreeps("constructor");
    for (var constr of constructor) {
      if (constr.store.getFreeCapacity(RESOURCE_ENERGY) > constr.store.getCapacity() / 2) {
        self._needsResources.push({
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_MID,
          structureType: constr.structureType,
          resourceType: "energy",
          amount: constr.store.getFreeCapacity(RESOURCE_ENERGY),
          id: constr.id,
        });
      }
    }

    _.forEach(this.room.labs, function (c) {
      if (c && c.memory.resource && c.memory.status == "fill" && c.store.getFreeCapacity(c.memory.resource) > 0 && c.memory.usedBy) {
        self._needsResources.push({
          priority: CONSTANTS.PRIORITY.LAB_FILL,
          resourceType: c.memory.resource,
          structureType: c.structureType,
          amount: c.store.getFreeCapacity(c.memory.resource),
          id: c.id,
        });
      }
    });

    if (this.getEnemys().length > 0) {
      prio = CONSTANTS.PRIORITY.TOWER_ENEMY;
    } else {
      prio = CONSTANTS.PRIORITY.TOWER_NORMAL;
    }

    if (this.room.controller && this.room.controller.my) {
      _.forEach(this.structuresNeedResource(this.room.towers, RESOURCE_ENERGY, prio, 400), (e) => self._needsResources.push(e));
      _.forEach(this.structuresNeedResource(this.room.spawns, RESOURCE_ENERGY, CONSTANTS.PRIORITY.SPAWN), (e) => self._needsResources.push(e));
      _.forEach(this.structuresNeedResource(this.room.extensions, RESOURCE_ENERGY, CONSTANTS.PRIORITY.EXTENSION), (e) => self._needsResources.push(e));
      _.forEach(this.structuresNeedResource(this.room.labs, RESOURCE_ENERGY, CONSTANTS.PRIORITY.LAB), (e) => self._needsResources.push(e));

      if (this.room.powerSpawn) {
        _.forEach(this.structuresNeedResource([this.room.powerSpawn], RESOURCE_ENERGY, CONSTANTS.PRIORITY.POWER_SPAWN_ENERGY, 400), (e) => self._needsResources.push(e));
        _.forEach(this.structuresNeedResource([this.room.powerSpawn], RESOURCE_POWER, CONSTANTS.PRIORITY.POWER_SPAWN_POWER, 90), (e) => self._needsResources.push(e));
      }
      if (this.room.nuker) {
        _.forEach(this.structuresNeedResource([this.room.nuker], RESOURCE_ENERGY, CONSTANTS.PRIORITY.NUKER_ENERGY), (e) => self._needsResources.push(e));
        _.forEach(this.structuresNeedResource([this.room.nuker], RESOURCE_GHODIUM, CONSTANTS.PRIORITY.NUKER_GHODIUM), (e) => self._needsResources.push(e));
      }
    }

    let fac = this.room.factory;
    if (fac && fac.store.getFreeCapacity() > 0) {
      for (var a of RESOURCES_ALL) {
        let fillLevel = global.getRoomThreshold(a, "factory");
        if (fac.level !== undefined) console.log("Factory Level: " + fac.level);
        if (fac.store[a] < fillLevel) {
          if (a === RESOURCE_ENERGY) {
            prio = CONSTANTS.PRIORITY.FACTORY_ENERGY;
          } else {
            prio = CONSTANTS.PRIORITY.FACTORY_MINERAL;
          }

          self._needsResources.push({
            priority: prio,
            structureType: fac.structureType,
            resourceType: a,
            amount: fillLevel - (fac.store[a] || 0),
            id: fac.id,
            exact: true,
          });
        }
      }
    }

    let sto = this.room.storage;
    let ter = this.room.terminal;

    if (sto && sto.store.getFreeCapacity() > 0) {
      for (var r of RESOURCES_ALL) {
        let amount = 0;
        let fillLevel = global.getRoomThreshold(r, "storage");
        if (r === "energy" && (sto.store[r] === undefined || sto.store[r] < fillLevel)) {
          prio = CONSTANTS.PRIORITY.STORAGE_ENERGY_MID;
          amount = fillLevel - (sto.store[r] || 0);
        } else if (r === "energy" && sto.store[r] >= fillLevel && sto.store[r] < CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD) {
          prio = CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW;
          amount = CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD - (sto.store[r] || 0);
        } else if (r !== "energy" && sto.store[r] < fillLevel) {
          prio = CONSTANTS.PRIORITY.STORAGE_MINERAL;
          amount = fillLevel - (sto.store[r] || 0);
        } else {
          continue;
        }

        self._needsResources.push({
          priority: prio,
          structureType: sto.structureType,
          resourceType: r,
          amount: amount,
          id: sto.id,
          exact: true,
        });
      }
    }

    if (ter && ter.store.getFreeCapacity() > 0) {
      for (var r of RESOURCES_ALL) {
        let amount = 0;
        if (r === "energy" && (ter.store[r] === undefined || ter.store[r] < global.getRoomThreshold(RESOURCE_ENERGY, "terminal"))) {
          prio = CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW;
          amount = global.getRoomThreshold(RESOURCE_ENERGY, "terminal") - (ter.store[r] || 0);
        } else if (r === "energy") {
          prio = CONSTANTS.PRIORITY.TERMINAL_ENERGY_OVERFLOW;
          amount = ter.store.getFreeCapacity();
        } else if (r !== "energy") {
          prio = CONSTANTS.PRIORITY.TERMINAL_MINERAL;
          amount = ter.store.getFreeCapacity();
        }
        self._needsResources.push({
          priority: prio,
          structureType: ter.structureType,
          resourceType: r,
          amount: amount,
          id: ter.id,
          exact: true,
        });
      }
    }
    // Sortieren nach Prio
    this._needsResources.sort((a, b) => {
      return a.priority - b.priority;
    });
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
ControllerRoom.prototype.getAllCreeps = function (role) {
  var room = this.room;
  var creeps = [];
  if (role) {
    creeps = Object.values(Game.creeps).filter((c) => c.memory.role === role && c.room === room);
  } else {
    creeps = Object.values(Game.creeps).filter((c) => c.room === room);
  }
  return creeps;
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
  if (controller !== null && controller.my) {
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
        var container = Game.getObjectById(containerId);
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
        // TODO Freie Plätze für Source berechnen
        // this.getCreeps funktioniert nicht.
        // console.log(this.getCreeps(null, s.id).length + " " + s.pos.freeFieldsCount());
        return s.energy > 0;
        // return (s.energy > 0) && (this.getCreeps(null, s.id).length < s.pos.freeFieldsCount)
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
    console.log(role + " : no canBuild() implemented");
    return false;
  }

  return cfg.canBuild(this);
};

ControllerRoom.prototype.centerPoint = function () {
  const freeRange = CONSTANTS.ROOM.FREE_RANGE;
  var bestPos;

  for (let x = 3; x < 46; x++) {
    for (let y = 3; y < 46; y++) {
      let pos = new RoomPosition(x, y, this.room.name);

      let exits = pos.findInRange(FIND_EXIT, freeRange);
      if (exits.length > 0) continue;

      let structs = pos.findInRange(FIND_STRUCTURES, freeRange, {
        filter: (s) => s.structureType != STRUCTURE_ROAD,
      });
      if (structs.length > 0) continue;

      let terrain = _.filter(this.room.lookForAtArea(LOOK_TERRAIN, y - freeRange, x - freeRange, y + freeRange, x + freeRange, true), (p) => p.type == "terrain" && p.terrain == "wall");
      if (terrain.length > 0) continue;

      let goodPos = new RoomPosition(x, y, this.room.name);

      let toSource = [];
      let toController;

      _.forEach(this.find(FIND_SOURCES), (s) => {
        toSource.push(
          this.room.findPath(goodPos, s.pos, {
            ignoreCreeps: true,
            ignoreRoads: true,
            maxRooms: 1,
          }).length
        );
      });

      toController = this.room.findPath(goodPos, this.room.controller.pos, {
        ignoreCreeps: true,
        ignoreRoads: true,
        maxRooms: 1,
      }).length;

      let cnt = 0;

      if (!bestPos) {
        bestPos = {
          x: goodPos.x,
          y: goodPos.y,
          c: toController,
          s: toSource,
        };
      }

      for (let foo in toSource) {
        if (bestPos.s[foo] > toSource[foo]) cnt++;
      }

      if (cnt >= 2 || (cnt >= 1 && toController <= bestPos.c) || toController * 2 <= bestPos.c) {
        bestPos = {
          x: goodPos.x,
          y: goodPos.y,
          c: toController,
          s: toSource,
        };
      }
    }
  }

  Log.error(`Check bug in function centerPoint: ${bestPos.x} ${bestPos.y} ${this.room.name}`, "centerPoint");
  let thePosition = new RoomPosition(bestPos.x, bestPos.y, this.room.name);
  return thePosition;
  // this.createFlag(bestPos.x, bestPos.y, 'CenterPoint:' + this.name, COLOR_PURPLE, COLOR_BLUE);
};

ControllerRoom.prototype.analyse = function () {
  if (Game.cpu.tickLimit <= CONSTANTS.CPU.NO_ANALYSE_LIMIT) return;
  var memory = this.room.memory;

  try {
    memory.lastCheck = Game.time;

    if (!memory.roomType) {
      // source keeper
      let lairs = this.room.find(STRUCTURE_KEEPER_LAIR);
      if (lairs.length > 0) {
        memory.roomType = "ROOMTYPE_SOURCEKEEPER";
      }

      // core
      if (!memory.roomType) {
        let sources = this.room.find(FIND_SOURCES);
        if (sources.length === CONSTANTS.ROOM.SOURCE_COUNT_CORE) {
          memory.roomType = "ROOMTYPE_CORE";
        }
      }

      // controller rooms
      if (!memory.roomType) {
        if (this.room.controller) {
          memory.roomType = "ROOMTYPE_CONTROLLER";
        } else {
          memory.roomType = "ROOMTYPE_ALLEY";
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
};

module.exports = ControllerRoom;
