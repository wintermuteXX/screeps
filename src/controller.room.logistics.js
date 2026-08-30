const ResourceManager = require("./service.resource");
const CONSTANTS = require("./config.constants");

class LogisticsManager {
  constructor(roomController) {
    this.rc = roomController;
  }

  /**
   * @param {Creep} creep
   * @returns {{ give: object, need: object }|null}
   */
  getTransportOrder(creep) {
    if (creep.store.getUsedCapacity() !== 0) return null;

    const claimedGiveIds = this._claimedTargetIds(true);
    const gives = this.givesResources();
    const needs = this.needsResources();

    for (const need of needs) {
      for (const give of gives) {
        if (claimedGiveIds.has(give.id)) continue;
        if (!this._canMatch(give, need)) continue;
        return { give, need };
      }
    }

    return null;
  }

  /**
   * @param {Creep} creep
   * @param {{ resourceType?: string|null, excludeId?: string|null, preferId?: string|null }} [options]
   * @returns {object|null}
   */
  getDeliveryOrder(creep, options = {}) {
    const resourceType = options.resourceType != null ? options.resourceType : null;
    const excludeId = options.excludeId || null;
    const preferId = options.preferId || null;

    const carried = new Set();
    for (const t of Object.keys(creep.store)) {
      if (creep.store[t] > 0) carried.add(t);
    }
    if (carried.size === 0) return null;
    if (resourceType != null && !carried.has(resourceType)) return null;

    const claimedNeedIds = this._claimedTargetIds(false);
    const needs = this.needsResources();

    /**
     * @param {object} need
     * @returns {boolean}
     */
    const isValidNeed = (need) => {
      if (resourceType != null) {
        if (need.resourceType !== resourceType) return false;
      } else if (!carried.has(need.resourceType)) {
        return false;
      }
      if (need.id === creep.id) return false;
      if (excludeId && need.id === excludeId) return false;
      if (claimedNeedIds.has(need.id)) return false;
      return !!this._validateResourceTarget(need.id, need.resourceType);
    };

    if (preferId) {
      for (const need of needs) {
        if (need.id !== preferId) continue;
        if (isValidNeed(need)) return need;
        break;
      }
    }

    for (const need of needs) {
      if (!isValidNeed(need)) continue;
      return need;
    }

    return null;
  }

  /**
   * Target ids currently claimed by creeps (empty = collecting from give; non-empty = delivering to need).
   * @param {boolean} emptyOnly - true: empty creeps (give sources); false: creeps carrying resources (need sinks)
   * @returns {Set<string>}
   */
  _claimedTargetIds(emptyOnly) {
    const ids = new Set();
    for (const c of this.rc.creeps.getAllCreeps()) {
      const used = c.store.getUsedCapacity();
      if (emptyOnly ? used !== 0 : used <= 0) continue;
      const id = this._creepTargetId(c);
      if (id) ids.add(id);
    }
    return ids;
  }

  /**
   * @param {object} give
   * @param {object} need
   * @returns {boolean}
   */
  _canMatch(give, need) {
    return give.resourceType === need.resourceType
      && give.id !== need.id
      && need.priority < give.priority
      && !!this._validateResourceTarget(need.id, need.resourceType);
  }

  _validateResourceTarget(targetId, resourceType) {
    const targetObj = Game.getObjectById(targetId);
    if (!targetObj) return null;

    if (targetObj.store) {
      const freeCap = targetObj.store.getFreeCapacity(resourceType) || 0;
      if (freeCap <= 0) return null;
      return { obj: targetObj, freeCapacity: freeCap };
    }

    // No store (e.g., controller) - assume valid
    return { obj: targetObj, freeCapacity: Infinity };
  }

  /**
   * Active logistics target for a creep (memory.target).
   * @param {Creep} creep
   * @returns {string|null}
   */
  _creepTargetId(creep) {
    return creep.memory.target || null;
  }

  _addGivesResource(entry) {
    if (!this.rc._givesResources) {
      this.rc._givesResources = [];
    }
    this.rc._givesResources.push(entry);
  }

  _isTooCloseToController(pos) {
    if (!this.rc.room.controller) {
      return false;
    }
    return pos.inRangeTo(this.rc.room.controller.pos, CONSTANTS.CONTROLLER.RANGE_FOR_DROPPED_RESOURCES);
  }

  _getStorageGivesPriority(resourceType, amount, fillLevel) {
    if (resourceType === RESOURCE_ENERGY) {
      if (amount <= fillLevel) {
        return {
          priority: CONSTANTS.PRIORITY.GIVE.ENERGY.STORAGE_LOW,
          amount: amount,
        };
      } else {
        return {
          priority: CONSTANTS.PRIORITY.GIVE.ENERGY.STORAGE_OVERFLOW,
          amount: amount - fillLevel,
        };
      }
    } else {
      // Minerals
      if (amount > fillLevel) {
        return {
          priority: CONSTANTS.PRIORITY.GIVE.MINERAL.STORAGE_OVERFLOW,
          amount: amount - fillLevel,
        };
      } else {
        return {
          priority: CONSTANTS.PRIORITY.GIVE.MINERAL.STORAGE_HIGH,
          amount: amount,
        };
      }
    }
  }

  _getStorageNeedsPriority(resourceType, currentAmount, fillLevel) {
    if (resourceType === RESOURCE_ENERGY) {
      if (currentAmount < fillLevel) {
        return {
          priority: CONSTANTS.PRIORITY.NEED.ENERGY.STORAGE_MID,
          amount: fillLevel - currentAmount,
        };
      } else if (currentAmount < CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD) {
        return {
          priority: CONSTANTS.PRIORITY.NEED.ENERGY.STORAGE_OVERFLOW,
          amount: CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD - currentAmount,
        };
      }
      return null; // Skip if already at max
    } else {
      // Minerals
      if (currentAmount < fillLevel) {
        return {
          priority: CONSTANTS.PRIORITY.NEED.MINERAL.STORAGE,
          amount: fillLevel - currentAmount,
        };
      }
      return null; // Skip if already at fill level
    }
  }

  _getTerminalGivesPriority(resourceType, amount, energyThreshold) {
    if (resourceType === RESOURCE_ENERGY) {
      if (amount <= energyThreshold) {
        return {
          priority: CONSTANTS.PRIORITY.GIVE.ENERGY.TERMINAL_LOW,
          amount: amount,
        };
      } else {
        return {
          priority: CONSTANTS.PRIORITY.GIVE.ENERGY.TERMINAL_OVERFLOW,
          amount: amount - energyThreshold,
        };
      }
    } else {
      // Minerals
      if (amount > 0) {
        return {
          priority: CONSTANTS.PRIORITY.GIVE.MINERAL.TERMINAL,
          amount: amount,
        };
      }
      return null; // Skip if no minerals
    }
  }

  _processStoreResources(findType, minAmount, priority, defaultStructureType) {
    this.rc.find(findType).forEach((item) => {
      // Use Object.keys() for better performance than for...in
      for (const resourceType of Object.keys(item.store)) {
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
  }

  _processTombstones() {
    this._processStoreResources(
      FIND_TOMBSTONES,
      CONSTANTS.RESOURCES.TOMBSTONE_MIN,
      CONSTANTS.PRIORITY.GIVE.ALL.TOMBSTONE,
      "tombstone",
    );
  }

  _processRuins() {
    this._processStoreResources(
      FIND_RUINS,
      0,
      CONSTANTS.PRIORITY.GIVE.ALL.RUIN,
      "ruin",
    );
  }

  _processLinks() {
    if (!this.rc.links.receivers) return;

    for (const link of this.rc.links.receivers) {
      if (link.energy > 0 && !this._isTooCloseToController(link.pos)) {
        this._addGivesResource({
          priority: CONSTANTS.PRIORITY.GIVE.ENERGY.LINK,
          resourceType: RESOURCE_ENERGY,
          structureType: link.structureType,
          amount: link.energy,
          id: link.id,
        });
      }
    }
  }

  _processDroppedResources() {
    for (const resource of this.rc.find(FIND_DROPPED_RESOURCES)) {
      if (resource.amount > CONSTANTS.RESOURCES.DROPPED_MIN && !this._isTooCloseToController(resource.pos)) {
        this._addGivesResource({
          priority: CONSTANTS.PRIORITY.GIVE.ALL.DROPPED,
          resourceType: resource.resourceType,
          amount: resource.amount,
          id: resource.id,
          greedy: resource.resourceType === RESOURCE_ENERGY,
        });
      }
    }
  }

  _processContainers() {
    const containers = [];

    // Get containers from sources (nutzt gecachten find() Cache)
    const sources = this.rc.find(FIND_SOURCES);
    for (const source of sources) {
      if (source && source.container) {
        containers.push(source.container);
      }
    }

    // Get container from extractor
    if (this.rc.room.extractor && this.rc.room.extractor.container) {
      containers.push(this.rc.room.extractor.container);
    }

    for (const container of containers) {
      if (!container || !container.store) continue;

      // Use Object.keys() for better performance than for...in
      for (const resourceType of Object.keys(container.store)) {
        const amount = container.store[resourceType];
        if (amount > CONSTANTS.RESOURCES.CONTAINER_MIN) {
          this._addGivesResource({
            priority: CONSTANTS.PRIORITY.GIVE.ALL.CONTAINER,
            resourceType: resourceType,
            structureType: container.structureType,
            amount: amount,
            id: container.id,
            greedy: resourceType === RESOURCE_ENERGY,
          });
        }
      }
    }
  }

  _processLabs() {
    if (!this.rc.room.labs) return;

    for (const lab of this.rc.room.labs) {
      if (!lab.memory || lab.memory.status !== "empty") continue;

      const result = lab.getFirstMineral();
      if (result && result.amount > 0) {
        this._addGivesResource({
          priority: CONSTANTS.PRIORITY.GIVE.ALL.LAB_EMPTY,
          resourceType: result.resource,
          structureType: lab.structureType,
          amount: result.amount,
          id: lab.id,
        });
      }
    }
  }

  _processFactory() {
    const {factory} = this.rc.room;
    if (!factory) return;

    for (const resourceType of RESOURCES_ALL) {
      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "factory");
      const amount = ResourceManager.getResourceAmount(this.rc.room, resourceType, "factory");

      if (amount > fillLevel) {
        this._addGivesResource({
          priority: CONSTANTS.PRIORITY.GIVE.ALL.FACTORY_OVERFLOW,
          structureType: factory.structureType,
          resourceType: resourceType,
          amount: amount - fillLevel,
          id: factory.id,
        });
      }
    }
  }

  _processStorage() {
    const {storage} = this.rc.room;
    if (!storage) return;

    for (const resourceType of RESOURCES_ALL) {
      const amount = ResourceManager.getResourceAmount(this.rc.room, resourceType, "storage");
      if (amount === 0) continue;

      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "storage");
      const priorityInfo = this._getStorageGivesPriority(resourceType, amount, fillLevel);

      if (priorityInfo) {
        this._addGivesResource({
          priority: priorityInfo.priority,
          structureType: storage.structureType,
          resourceType: resourceType,
          amount: priorityInfo.amount,
          id: storage.id,
        });
      }
    }
  }

  _processTerminal() {
    const {terminal} = this.rc.room;
    if (!terminal) return;

    const energyThreshold = this.rc.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");

    for (const resourceType of RESOURCES_ALL) {
      const amount = ResourceManager.getResourceAmount(this.rc.room, resourceType, "terminal");
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
  }

  givesResources() {
    if (!this.rc._givesResources) {
      this.rc._givesResources = [];

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
      this.rc._givesResources.sort((a, b) => b.priority - a.priority);
    }

    return this.rc._givesResources;
  }

  _addNeedsResource(entry) {
    if (!this.rc._needsResources) {
      this.rc._needsResources = [];
    }
    this.rc._needsResources.push(entry);
  }

  /**
   * @returns {boolean}
   */
  _hasOwnedController() {
    return !!(this.rc.room.controller && this.rc.room.controller.my);
  }

  /**
   * @param {Structure[]} structures
   * @param {string} resourceType
   * @param {number} priority
   * @param {number} [threshold]
   * @returns {void}
   */
  _addStructureNeeds(structures, resourceType, priority, threshold) {
    if (!this._hasOwnedController()) return;

    const needs = this.rc.structures.structuresNeedResource(structures, resourceType, priority, threshold);
    for (const need of needs) {
      this._addNeedsResource(need);
    }
  }

  _getControllerPriority() {
    if (!this.rc.room.controller) {
      return CONSTANTS.PRIORITY.NEED.ENERGY.CONTROLLER_NORMAL;
    }

    const {ticksToDowngrade} = this.rc.room.controller;
    if (ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_CRITICAL) {
      return CONSTANTS.PRIORITY.NEED.ENERGY.CONTROLLER_CRITICAL;
    } else if (ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_LOW) {
      return CONSTANTS.PRIORITY.NEED.ENERGY.CONTROLLER_LOW;
    }

    return CONSTANTS.PRIORITY.NEED.ENERGY.CONTROLLER_NORMAL;
  }

  _processUpgraders(priority) {
    if (!this.rc.room.controller || this.rc.room.controller.container) return;

    const upgraders = this.rc.creeps.getCreeps("upgrader");
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
  }

  _processController(priority) {
    const controllerContainer = this.rc.getControllerNotFull();
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
  }

  _processConstructors() {
    const constructors = this.rc.creeps.getCreeps("constructor");
    for (const constructor of constructors) {
      const freeCapacity = constructor.store.getFreeCapacity(RESOURCE_ENERGY);
      const capacity = constructor.store.getCapacity();

      // Only add if more than half capacity is free
      if (freeCapacity > capacity / 2) {
        this._addNeedsResource({
          priority: CONSTANTS.PRIORITY.NEED.ENERGY.CONSTRUCTOR,
          structureType: constructor.structureType,
          resourceType: RESOURCE_ENERGY,
          amount: freeCapacity,
          id: constructor.id,
        });
      }
    }
  }

  _processLabsNeeds() {
    if (!this.rc.room.labs) return;

    for (const lab of this.rc.room.labs) {
      if (!lab.memory || lab.memory.status !== "fill" || !lab.memory.usedBy) continue;

      const resourceType = lab.memory.resource;
      if (!resourceType) continue;

      const freeCapacity = lab.store.getFreeCapacity(resourceType);
      if (freeCapacity > 0) {
        this._addNeedsResource({
          priority: CONSTANTS.PRIORITY.NEED.MINERAL.LAB_FILL,
          resourceType: resourceType,
          structureType: lab.structureType,
          amount: freeCapacity,
          id: lab.id,
        });
      }
    }
  }

  _processTowerNeeds() {
    if (!this._hasOwnedController()) return;

    const towerPriority = this.rc.structures.getEnemies().length > 0
      ? CONSTANTS.PRIORITY.NEED.ENERGY.TOWER_ENEMY
      : CONSTANTS.PRIORITY.NEED.ENERGY.TOWER_NORMAL;

    this._addStructureNeeds(
      this.rc.room.towers,
      RESOURCE_ENERGY,
      towerPriority,
      CONSTANTS.STRUCTURE_ENERGY.TOWER_ENERGY_THRESHOLD,
    );
  }

  _processSpawnNeeds() {
    this._addStructureNeeds(this.rc.room.spawns, RESOURCE_ENERGY, CONSTANTS.PRIORITY.NEED.ENERGY.SPAWN);
  }

  _processExtensionNeeds() {
    this._addStructureNeeds(this.rc.room.extensions, RESOURCE_ENERGY, CONSTANTS.PRIORITY.NEED.ENERGY.EXTENSION);
  }

  _processLabEnergyNeeds() {
    this._addStructureNeeds(this.rc.room.labs, RESOURCE_ENERGY, CONSTANTS.PRIORITY.NEED.ENERGY.LAB);
  }

  _processPowerSpawnNeeds() {
    if (!this._hasOwnedController() || !this.rc.room.powerSpawn) return;

    const {powerSpawn} = this.rc.room;
    this._addStructureNeeds(
      [powerSpawn],
      RESOURCE_ENERGY,
      CONSTANTS.PRIORITY.NEED.ENERGY.POWER_SPAWN,
      CONSTANTS.STRUCTURE_ENERGY.POWER_SPAWN_ENERGY_THRESHOLD,
    );
    this._addStructureNeeds(
      [powerSpawn],
      RESOURCE_POWER,
      CONSTANTS.PRIORITY.NEED.POWER.POWER_SPAWN,
      CONSTANTS.STRUCTURE_ENERGY.POWER_SPAWN_POWER_THRESHOLD,
    );
  }

  _processNukerNeeds() {
    if (!this._hasOwnedController() || !this.rc.room.nuker) return;

    const {nuker} = this.rc.room;
    this._addStructureNeeds([nuker], RESOURCE_ENERGY, CONSTANTS.PRIORITY.NEED.ENERGY.NUKER);
    this._addStructureNeeds([nuker], RESOURCE_GHODIUM, CONSTANTS.PRIORITY.NEED.GHODIUM.NUKER);
  }

  _processFactoryNeeds() {
    const {factory} = this.rc.room;
    if (!factory || factory.store.getFreeCapacity() === 0) return;

    for (const resourceType of RESOURCES_ALL) {
      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "factory");
      const currentAmount = factory.store[resourceType] || 0;

      if (currentAmount < fillLevel) {
        const priority = resourceType === RESOURCE_ENERGY
          ? CONSTANTS.PRIORITY.NEED.ENERGY.FACTORY
          : CONSTANTS.PRIORITY.NEED.MINERAL.FACTORY;

        this._addNeedsResource({
          priority: priority,
          structureType: factory.structureType,
          resourceType: resourceType,
          amount: fillLevel - currentAmount,
          id: factory.id,
        });
      }
    }
  }

  _processStorageNeeds() {
    const {storage} = this.rc.room;
    if (!storage || storage.store.getFreeCapacity() === 0) return;

    for (const resourceType of RESOURCES_ALL) {
      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "storage");
      const currentAmount = ResourceManager.getResourceAmount(this.rc.room, resourceType, "storage");
      const priorityInfo = this._getStorageNeedsPriority(resourceType, currentAmount, fillLevel);

      if (priorityInfo) {
        this._addNeedsResource({
          priority: priorityInfo.priority,
          structureType: storage.structureType,
          resourceType: resourceType,
          amount: priorityInfo.amount,
          id: storage.id,
        });
      }
    }
  }

  _processTerminalNeeds() {
    const {terminal} = this.rc.room;
    if (!terminal || terminal.store.getFreeCapacity() === 0) return;

    const energyThreshold = this.rc.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
    const freeCapacity = terminal.store.getFreeCapacity();

    for (const resourceType of RESOURCES_ALL) {
      const currentAmount = ResourceManager.getResourceAmount(this.rc.room, resourceType, "terminal");
      let priority;
      let neededAmount;

      if (resourceType === RESOURCE_ENERGY) {
        if (currentAmount < energyThreshold) {
          priority = CONSTANTS.PRIORITY.NEED.ENERGY.TERMINAL_LOW;
          neededAmount = Math.min(energyThreshold - currentAmount, freeCapacity);
        } else {
          const storageEnergy = ResourceManager.getResourceAmount(this.rc.room, RESOURCE_ENERGY, "storage");
          if (
            storageEnergy > CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD &&
            currentAmount < CONSTANTS.TERMINAL.MAX_ENERGY
          ) {
            priority = CONSTANTS.PRIORITY.NEED.ENERGY.TERMINAL_HIGH;
            neededAmount = Math.min(
              CONSTANTS.TERMINAL.MAX_ENERGY - currentAmount,
              freeCapacity,
            );
          } else {
            continue;
          }
        }
      } else {
        // Surplus sink: accept any mineral into terminal when space is available.
        // Priority NEED.MINERAL.TERMINAL is below labs, factory, storage, etc., so those
        // needs win first; remainder flows here for internalTrade and market sell.
        const freeForType = terminal.store.getFreeCapacity(resourceType);
        if (freeForType <= 0) {
          continue;
        }
        priority = CONSTANTS.PRIORITY.NEED.MINERAL.TERMINAL;
        neededAmount = freeForType;
      }

      // Only add if we actually need something
      if (neededAmount > 0) {
        this._addNeedsResource({
          priority: priority,
          structureType: terminal.structureType,
          resourceType: resourceType,
          amount: neededAmount,
          id: terminal.id,
        });
      }
    }
  }

  needsResources() {
    if (!this.rc._needsResources) {
      this.rc._needsResources = [];

      // Get controller priority
      const controllerPriority = this._getControllerPriority();

      this._processUpgraders(controllerPriority);
      this._processController(controllerPriority);
      this._processConstructors();
      this._processLabsNeeds();
      this._processTowerNeeds();
      this._processSpawnNeeds();
      this._processExtensionNeeds();
      this._processLabEnergyNeeds();
      this._processPowerSpawnNeeds();
      this._processNukerNeeds();
      this._processFactoryNeeds();
      this._processStorageNeeds();
      this._processTerminalNeeds();

      // Sort by priority (lowest first = highest priority)
      this.rc._needsResources.sort((a, b) => a.priority - b.priority);
    }

    return this.rc._needsResources;
  }
}

module.exports = LogisticsManager;