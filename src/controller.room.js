const ControllerSpawn = require("./controller.spawn");
const ControllerLink = require("./controller.link");
const ControllerTower = require("./controller.tower");
const ControllerTerminal = require("./controller.terminal");
const ControllerFactory = require("./controller.factory");
const ControllerLab = require("./controller.lab");
const CONSTANTS = require("./config.constants");
const CreepManager = require("./controller.room.creeps");
const LogisticsManager = require("./controller.room.logistics");
const StructuresManager = require("./controller.room.structures");
const RoomPlanner = require("./service.planner");
const Log = require("./lib.log");

class ControllerRoom {
  constructor(room, controllerGame) {
    this.room = room;
    this.controllerGame = controllerGame;

    this._creepsByRole = null;
    this._givesResources = null;
    this._needsResources = null;

    this.links = new ControllerLink(this);
    this.spawns = new ControllerSpawn(this);
    this.towers = new ControllerTower(this);
    this.terminal = new ControllerTerminal(this);
    this.factory = new ControllerFactory(this);
    this.labs = new ControllerLab(this);
    this.planner = new RoomPlanner(this.room);

    this.creeps = new CreepManager(this);
    this.logistics = new LogisticsManager(this);
    this.structures = new StructuresManager(this);
  }

  /**
   * Reset per-tick caches
   * @returns {void}
   */
  resetCaches() {
    this._creepsByRole = null;
    this._givesResources = null;
    this._needsResources = null;
  }

  /**
   * Run the full room tick
   * @returns {void}
   */
  run() {
    // 1. Cache reset
    this.resetCaches();

    // 2. Core operations (always executed)
    this.creeps.populate();
    this.links.transferEnergy();
    this.measureRclUpgradeTime();
    this.creeps.commandCreeps();

    // 3. Planning
    if (Game.time % CONSTANTS.TICKS.ROOM_PLANNER === 0) {
      this.planner.run();
    }
    // Draw visualization every tick if active (independent of planner.run())
    if (this.room.memory.planner && this.room.memory.planner.visualizeUntil && Game.time <= this.room.memory.planner.visualizeUntil) {
      this.planner._drawVisualization();
      if (Game.time >= this.room.memory.planner.visualizeUntil) {
        this.room.memory.planner.visualizeUntil = null;
      }
    }

    // 4. Defense & structures
    const hasEnoughEnergy = this.room.getResourceAmount(RESOURCE_ENERGY, "all") > this.room.getRoomThreshold(RESOURCE_ENERGY, "all");
    const shouldRepair = hasEnoughEnergy || (Game.time % CONSTANTS.TICKS.REPAIR_TOWER === 0 && !(this.getLevel() === 8 && Math.random() >= 0.5));
    this.towers.run(shouldRepair);
    if (Game.time % CONSTANTS.TICKS.ADJUST_WALL_HITS === 0) {
      this.structures.adjustWallHits();
    }

    // 5. Trading & resources
    this.terminal.run();

    // 6. Production (CPU-dependent operations)
    if (this._hasCpuAvailable()) {
      // Labs: Find partners and check status
      if (this.room.labs && this.room.labs.length > 0 && Game.time % CONSTANTS.TICKS.ROOM_PLANNER === 0) {
        this.labs.findLabPartner();
      }
      if (Game.time % CONSTANTS.TICKS.LAB_CHECK_STATUS === 0) {
        this.labs.checkStatus();
      }
      // Labs: Produce reactions
      this.labs.produce();
    }

    // Factory: Assign level (no CPU check needed)
    if (this.room.factory) {
      this.factory.assignLevel();
    }
    // Factory: Produce commodities (low CPU threshold)
    if (this._hasCpuAvailable(CONSTANTS.CPU.BUCKET_LOW)) {
      this.factory.produce();
    }

    // 7. Power management
    if (this._hasCpuAvailable()) {
      if (this.room.powerSpawn && this.room.powerSpawn.store.energy > 0 && this.room.powerSpawn.store.power > 0) {
        this.room.powerSpawn.processPower();
      }
    }
  }

  /**
   * Get a transport order for a creep
   * @param {Creep} creep - The creep
   * @returns {Object|null} Transport order or null
   */
  getTransportOrder(creep) {
    return this.logistics.getTransportOrder(creep);
  }

  /**
   * Get a delivery order for a creep
   * @param {Creep} creep - The creep
   * @param {string|null} resourceType - Optional resource filter
   * @returns {Object|null} Delivery order or null
   */
  getDeliveryOrder(creep, resourceType = null) {
    return this.logistics.getDeliveryOrder(creep, resourceType);
  }

  /**
   * Helper to check if CPU is available for optional operations
   * @param {number} [bucketThreshold] - Minimum CPU bucket required
   * @returns {boolean} True when CPU is available
   */
  _hasCpuAvailable(bucketThreshold) {
    const threshold = bucketThreshold || CONSTANTS.CPU.BUCKET_MEDIUM;
    return Game.cpu.limit - Game.cpu.getUsed() > 0 && Game.cpu.bucket > threshold;
  }

  /**
   * Get or create the room memory object
   * @returns {Object} Room memory object
   */
  _getOrCreateRoomMemory() {
    if (!Memory.rooms) {
      Memory.rooms = {};
    }
    if (!Memory.rooms[this.room.name]) {
      Memory.rooms[this.room.name] = {};
    }
    return Memory.rooms[this.room.name];
  }

  /**
   * Get structures that can give resources
   * @returns {Array} Resource provider list
   */
  givesResources() {
    return this.logistics.givesResources();
  }

  /**
   * Get structures that need resources
   * @returns {Array} Resource request list
   */
  needsResources() {
    return this.logistics.needsResources();
  }

  /**
   * Cached room.find wrapper
   * Caches find results per-tick to avoid redundant find() calls
   * Cache is automatically cleared each tick (new ControllerRoom instance)
   * @param {number} type - Screeps find constant
   * @returns {Array} Found objects
   */
  find(type) {
    // Initialize cache map if not exists
    if (!this._findCache) {
      this._findCache = new Map();
    }

    // Return cached result if available
    if (this._findCache.has(type)) {
      return this._findCache.get(type);
    }

    // Perform find and cache result
    const result = this.room.find(type);
    this._findCache.set(type, result);
    return result;
  }

  /**
   * Get creeps by role and/or target
   * @param {string|null} role - Creep role
   * @param {string|null} target - Target id
   * @returns {Creep[]} Array of creeps
   */
  getCreeps(role, target) {
    return this.creeps.getCreeps(role, target);
  }

  /**
   * Get all creeps in the room, optionally filtered by role
   * @param {string|null} role - Creep role
   * @returns {Creep[]} Array of creeps
   */
  getAllCreeps(role) {
    return this.creeps.getAllCreeps(role);
  }

  /**
   * Find the nearest link to an object
   * @param {RoomObject} obj - Object to search near
   * @param {Object} options - Link search options
   * @returns {StructureLink|null} The nearest link or null
   */
  findNearLink(obj, options) {
    return this.structures.findNearLink(obj, options);
  }

  /**
   * Get hostile creeps in the room
   * @returns {Creep[]} Array of hostile creeps
   */
  getEnemies() {
    return this.structures.getEnemies();
  }

  /**
   * Get room controller level
   * @returns {number} Controller level or 0
   */
  getLevel() {
    const { controller } = this.room;
    if (controller && controller.my) {
      return controller.level;
    }
    return 0;
  }

  /**
   * Build a needs list for structures
   * @param {Structure[]} structures - Structures to evaluate
   * @param {ResourceConstant} resource - Resource type
   * @param {number} prio - Priority value
   * @param {number} threshold - Minimum free capacity
   * @returns {Array} Needs array
   */
  structuresNeedResource(structures, resource, prio, threshold) {
    return this.structures.structuresNeedResource(structures, resource, prio, threshold);
  }

  /**
   * Get total dropped resource amount
   * @returns {number} Total amount
   */
  getDroppedResourcesAmount() {
    let amount = 0;
    for (const s of this.find(FIND_DROPPED_RESOURCES)) {
      amount += s.amount;
    }
    return amount;
  }

  /**
   * Get controller container if it can accept more energy
   * @returns {StructureContainer|null} Container or null
   */
  getControllerNotFull() {
    const controllerz = this.room.controller;
    if (controllerz) {
      // Access via controller.memory (now uses structures.controllers[controllerId])
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
  }

  /**
   * Get the first idle spawn
   * @returns {StructureSpawn|null} Spawn or null
   */
  getIdleSpawn() {
    return this.spawns.getIdle();
  }

  /**
   * Get remaining mineral amount in the room
   * @returns {number} Mineral amount
   */
  getMineralAmount() {
    const minerals = this.find(FIND_MINERALS);
    if (!minerals || minerals.length === 0) {
      return 0;
    }
    return minerals[0].mineralAmount;
  }

  /**
   * Get sources with remaining energy
   * @returns {Source[]} Array of sources
   */
  getSourcesNotEmpty() {
    const sources = this.find(FIND_SOURCES);
    if (sources && sources.length > 0) {
      return _.filter(sources, (s) => {
        return s.energy > 0;
      });
    }
    return [];
  }

  /**
   * Find the first possible lab reaction in this room
   * @returns {Object|null} Reaction descriptor or null
   */
  getFirstPossibleLabReaction() {
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
    return null;
  }

  /**
   * Find structures that need repair
   * @returns {Structure[]} Array of structures
   */
  findStructuresToRepair() {
    return this.structures.findStructuresToRepair();
  }

  /**
   * Measure time to upgrade RCL levels
   * Stores upgrade times in Memory.rooms[roomName].rclUpgradeTimes
   * Format: { "1": 1234, "2": 2345, ... } where key is the level reached
   */
  measureRclUpgradeTime() {
    // Only measure for owned rooms with controller
    if (!this.room.controller || !this.room.controller.my) {
      return;
    }

    const currentLevel = this.room.controller.level;
    const roomMemory = this._getOrCreateRoomMemory();

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

    const { lastLevel } = roomMemory.rclUpgradeTimes;
    const { lastLevelTick } = roomMemory.rclUpgradeTimes;

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

      // When room reaches RCL 3, clear temporary claimer target
      if (currentLevel >= 3 && Memory.roomToClaim === this.room.name) {
        Memory.roomToClaim = undefined;
        Log.success(`🏰 ${this.room} reached RCL 3, removed from claimer target list`, "ControllerRoom");
      }
    } else if (currentLevel < lastLevel) {
      // Level decreased (shouldn't happen normally, but handle it)
      // Reset tracking
      roomMemory.rclUpgradeTimes.lastLevel = currentLevel;
      roomMemory.rclUpgradeTimes.lastLevelTick = Game.time;
    }
    // If level is the same, do nothing - tracking continues
  }
}

module.exports = ControllerRoom;
