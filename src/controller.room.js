const ControllerSpawn = require("./controller.spawn");
const ControllerLink = require("./controller.link");
const ControllerTower = require("./controller.tower");
const ControllerTerminal = require("./controller.terminal");
const ControllerFactory = require("./controller.factory");
const ControllerLab = require("./controller.lab");
const RoomPlanner = require("./service.planner");
const CONSTANTS = require("./config.constants");
const CreepManager = require("./controller.room.creeps");
const LogisticsManager = require("./controller.room.logistics");
const StructuresManager = require("./controller.room.structures");
const CacheManager = require("./utils.cache");
const Log = require("./lib.log");

function ControllerRoom(room, ControllerGame) {
  this.room = room;
  this.cache = new CacheManager();
  this._spawns = [];
  this._towers = [];
  this._creepsByRole = null;  // Cache for getAllCreeps

  // Initialize Dune faction and planet for this room
  this._initializeDuneIdentity();

  // Nutze gecachten room.spawns Getter (filtert nach my)
  const spawns = this.room.spawns.filter(s => s.my);
  for (const spawn of spawns) {
    this._spawns.push(new ControllerSpawn(spawn, this));
  }

  this.links = new ControllerLink(this);

  const {towers} = this.room;

  for (const tower of towers) {
    this._towers.push(new ControllerTower(tower, this));
  }

  this.terminal = new ControllerTerminal(this);
  this.factory = new ControllerFactory(this);
  this.labs = new ControllerLab(this);
  this.planner = new RoomPlanner(this.room);

  // Initialize managers
  this.creeps = new CreepManager(this);
  this.logistics = new LogisticsManager(this);
  this.structures = new StructuresManager(this);
}

ControllerRoom.prototype.run = function () {
  // Reset caches at the start of each tick
  // CacheManager automatically clears on tick change, but we still need to reset manual caches
  this._creepsByRole = null;
  this._givesResources = null;
  this._needsResources = null;

  this.creeps.populate();

  // Run RoomPlanner (every 50 ticks to save CPU)
  if (Game.time % CONSTANTS.TICKS.ROOM_PLANNER === 0) {
    this.planner.run();
  }

  // Draw visualization every tick if active (independent of planner.run())
  if (this.room.memory.planner && this.room.memory.planner.visualizeUntil && Game.time <= this.room.memory.planner.visualizeUntil) {
    this.planner._drawVisualization();
    // Auto-disable after 15 ticks
    if (Game.time >= this.room.memory.planner.visualizeUntil) {
      this.room.memory.planner.visualizeUntil = null;
    }
  }

  this.links.transferEnergy();

  this.measureRclUpgradeTime();

  this.creeps.commandCreeps();

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

// Creep management delegated to CreepManager

ControllerRoom.prototype.getTransportOrder = function (Creep) {
  return this.logistics.getTransportOrder(Creep);
};

ControllerRoom.prototype.getDeliveryOrder = function (Creep, resourceType = null) {
  return this.logistics.getDeliveryOrder(Creep, resourceType);
};

/**
 * Helper function to check if CPU is available for optional operations
 * @param {number} [bucketThreshold] - Minimum CPU bucket required (default: BUCKET_MEDIUM)
 * @returns {boolean} True if CPU is available
 */
ControllerRoom.prototype._hasCpuAvailable = function (bucketThreshold) {
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

// Logistics methods delegated to LogisticsManager
ControllerRoom.prototype.givesResources = function () {
  return this.logistics.givesResources();
};

ControllerRoom.prototype.needsResources = function () {
  return this.logistics.needsResources();
};

ControllerRoom.prototype.find = function (type) {
  return this.cache.get(`find_${type}`, () => {
    return this.room.find(type);
  });
};

// Creep methods delegated to CreepManager
ControllerRoom.prototype.getCreeps = function (role, target) {
  return this.creeps.getCreeps(role, target);
};

ControllerRoom.prototype.getAllCreeps = function (role) {
  return this.creeps.getAllCreeps(role);
};

// Structure methods delegated to StructuresManager
ControllerRoom.prototype.findNearLink = function (obj) {
  return this.structures.findNearLink(obj);
};

ControllerRoom.prototype.getEnemys = function () {
  return this.structures.getEnemys();
};

ControllerRoom.prototype.getLevel = function () {
  const {controller} = this.room;
  if (controller && controller.my) {
    return controller.level;
  }
  return 0;
};

ControllerRoom.prototype.structuresNeedResource = function (structures, resource, prio, threshold) {
  return this.structures.structuresNeedResource(structures, resource, prio, threshold);
};

ControllerRoom.prototype.getDroppedResourcesAmount = function () {
  return this.cache.get("droppedResourcesAmount", () => {
    let amount = 0;
    for (const s of this.find(FIND_DROPPED_RESOURCES)) {
      amount += s.amount;
    }
    return amount;
  });
};

ControllerRoom.prototype.getControllerNotFull = function () {
  return this.cache.get("controllerNotFull", () => {
    const controllerz = this.room.controller;
    if (controllerz) {
      const containerId = controllerz.memory.containerID || null;
      if (containerId != null) {
        const container = /** @type {StructureContainer | null} */ (Game.getObjectById(containerId));
        if (container != null) {
          if (container.store && container.store[RESOURCE_ENERGY] + CONSTANTS.RESOURCES.CONTROLLER_ENERGY_BUFFER < container.store.getCapacity(RESOURCE_ENERGY)) {
            return container;
          }
        }
      }
    }
    return null;
  });
};

ControllerRoom.prototype.getIdleSpawn = function () {
  for (const sc of this._spawns) {
    if (sc.isIdle()) {
      return sc;
    }
  }
  return null;
};

ControllerRoom.prototype.getIdleSpawnObject = function () {
  // Nutze gecachten room.spawns Getter (filtert nach my)
  const spawns = this.room.spawns.filter(s => s.my);
  for (const sc of spawns) {
    if (!sc.spawning) {
      return sc;
    }
  }
  return null;
};

ControllerRoom.prototype.getMineralAmount = function () {
  return this.cache.get("mineralAmount", () => {
    const minerals = this.find(FIND_MINERALS);
    if (!minerals || minerals.length === 0) {
      return 0;
    }
    return minerals[0].mineralAmount;
  });
};

ControllerRoom.prototype.getSourcesNotEmpty = function () {
  return this.cache.get("sourcesNotEmpty", () => {
    // Nutzt gecachten find() Cache statt getSources()
    const sources = this.find(FIND_SOURCES);
    if (sources && sources.length > 0) {
      return _.filter(sources, (s) => {
        return s.energy > 0;
      });
    }
    return [];
  });
};

ControllerRoom.prototype.getFirstPossibleLabReaction = function () {
  for (const [key, obj] of Object.entries(REACTIONS)) {
    for (const [prop, result] of Object.entries(obj)) {
          if (
            this.room.getResourceAmount(key, "all") >= CONSTANTS.RESOURCES.LAB_REACTION_MIN &&
            this.room.getResourceAmount(prop, "all") >= CONSTANTS.RESOURCES.LAB_REACTION_MIN &&
            this.room.getResourceAmount(result, "all") < this.room.getRoomThreshold(result, "all")
          ) {
            return {
              resourceA: key,
              resourceB: prop,
              result: result,
            };
          }
        }
      }
};

ControllerRoom.prototype.findStructuresToRepair = function () {
  return this.structures.findStructuresToRepair();
};

// _shouldCreateCreep is now in CreepManager

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

  const {lastLevel} = roomMemory.rclUpgradeTimes;
  const {lastLevelTick} = roomMemory.rclUpgradeTimes;

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

/**
 * Initialisiert die Dune-Identität für diesen Raum (Fraktion und Planet)
 * Wird nur einmal beim ersten Mal ausgeführt
 */
ControllerRoom.prototype._initializeDuneIdentity = function () {
  const roomMemory = this._ensureRoomMemory();

  // Nur für eigene Räume mit Controller
  if (!this.room.controller || !this.room.controller.my) {
    return;
  }

  // Initialisiere nur einmal
  if (!roomMemory.duneFaction || !roomMemory.dunePlanet) {
    const duneConfig = require("./config.dune");

    // Wähle eine zufällige Fraktion
    roomMemory.duneFaction = duneConfig.getRandomFaction();

    // Wähle einen zufälligen Planeten für diese Fraktion
    roomMemory.dunePlanet = duneConfig.getRandomPlanetForFaction(roomMemory.duneFaction);

    Log.info(`Room ${this.room.name} assigned to faction ${roomMemory.duneFaction} on planet ${roomMemory.dunePlanet}`, "DuneInit");
  }
};

/**
 * Gibt die Fraktion dieses Raums zurück
 * @returns {string} Fraktionsname
 */
ControllerRoom.prototype.getDuneFaction = function () {
  const roomMemory = this._ensureRoomMemory();
  return roomMemory.duneFaction || null;
};

/**
 * Gibt den Planeten dieses Raums zurück
 * @returns {string} Planetname
 */
ControllerRoom.prototype.getDunePlanet = function () {
  const roomMemory = this._ensureRoomMemory();
  return roomMemory.dunePlanet || null;
};

module.exports = ControllerRoom;
