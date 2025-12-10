const ResourceManager = require("./service.resource");
const CONSTANTS = require("./config.constants");

class LogisticsManager {
  constructor(roomController) {
    this.rc = roomController;
  }

  getTransportOrder(Creep) {
    let givesResources = this.givesResources();
    let needsResources = this.needsResources();
    
    // Check if creep is empty
    const isEmpty = Creep.store.getUsedCapacity() === 0;
    
    // Only assign orders to empty creeps
    if (!isEmpty) {
      return null;
    }
    
    // Collect all matching pairs with priority check
    const matchingOrders = [];
    for (const g in givesResources) {
      const give = givesResources[g];
      for (const n in needsResources) {
        const need = needsResources[n];
        
        // Basic compatibility check
        if (give.resourceType !== need.resourceType) continue;
        if (need.id === give.id) continue;
        
        // PRIORITY CHECK: Only match if need.priority < give.priority (same as visualizeLogistic)
        if (need.priority >= give.priority) continue;
        
        // Only block if an EMPTY creep is already targeting this source (empty creeps collect resources)
        if (this.rc.creeps.getAllCreeps().some(c => c.memory.target === give.id && c.store.getUsedCapacity() === 0)) continue;
        
        // Check if target still exists and has capacity
        const targetValidation = this._validateResourceTarget(need.id, need.resourceType);
        if (!targetValidation) continue;
        
        // Add to matching orders with priority for sorting
        matchingOrders.push({
          give: give,
          need: need,
          priority: need.priority
        });
      }
    }
    
    // Sort by need.priority (lowest first, same as visualizeLogistic)
    matchingOrders.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    // Return first matching order
    if (matchingOrders.length > 0) {
      const order = matchingOrders[0];
      order.give.orderType = "G";
      
      // Update Creep.memory.resources with orderType
      this._updateCreepResourceMemory(Creep, order.give.resourceType, order.give.id, order.give.orderType, 0);
      
      return order.give;
    }
    
    return null;
  }

  getDeliveryOrder(Creep, resourceType = null) {
    let givesResources = this.givesResources(); // Need to check priority
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
    
    // Find matching orders - collect all matches with priority check
    const matchingOrders = [];
    
    for (const resType of resourcesToCheck) {
      if (Creep.store[resType] <= 0) continue;
      
      // Find corresponding give for this resource type to check priority
      const correspondingGive = givesResources.find(g => g.resourceType === resType && g.id !== Creep.id);
      
      for (const n in needsResources) {
        const need = needsResources[n];
        
        // Basic compatibility check
        if (need.resourceType !== resType) continue;
        if (need.id === Creep.id) continue;
        
        // PRIORITY CHECK: Only match if need.priority < give.priority (same as visualizeLogistic)
        if (correspondingGive && need.priority >= correspondingGive.priority) continue;
        
        // Only block if a creep WITH RESOURCES is already targeting this destination (creeps with resources deliver)
        if (this.rc.creeps.getAllCreeps().some(c => c.memory.target === need.id && c.store.getUsedCapacity() > 0)) continue;

        // Check if target still exists and has capacity
        const targetValidation = this._validateResourceTarget(need.id, resType);
        if (!targetValidation) continue;
        
        // Found matching order - set orderType and add to list
        need.orderType = "D";
        
        // Update Creep.memory.resources with orderType
        this._updateCreepResourceMemory(Creep, resType, need.id, need.orderType, Creep.store[resType] || 0);
        
        matchingOrders.push(need);
      }
    }
    
    // Sort by priority (lowest first, same as visualizeLogistic)
    matchingOrders.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    // Return format: if resourceType specified, return single order; otherwise return array
    if (matchingOrders.length > 0) {
      if (resourceType !== null) {
        // Specific resource type requested - return first matching order for this type
        const firstForType = matchingOrders.find(o => o.resourceType === resourceType);
        return firstForType || null;
      } else {
        // All resource types - return sorted array
        return matchingOrders;
      }
    }
    
    return null;
  }

  _validateResourceTarget(targetId, resourceType) {
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
  }

  _updateCreepResourceMemory(creep, resourceType, targetId, orderType, amount) {
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
  }

  _getStorageNeedsPriority(resourceType, currentAmount, fillLevel) {
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
  }

  _getTerminalGivesPriority(resourceType, amount, energyThreshold) {
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
  }

  _processStoreResources(findType, minAmount, priority, defaultStructureType) {
    this.rc.find(findType).forEach((item) => {
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
  }

  _processTombstones() {
    this._processStoreResources(
      FIND_TOMBSTONES,
      CONSTANTS.RESOURCES.TOMBSTONE_MIN,
      CONSTANTS.PRIORITY.TOMBSTONE,
      "tombstone"
    );
  }

  _processRuins() {
    this._processStoreResources(
      FIND_RUINS,
      0,
      CONSTANTS.PRIORITY.RUIN,
      "ruin"
    );
  }

  _processLinks() {
    if (!this.rc.links.receivers) return;
    
    for (const link of this.rc.links.receivers) {
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
  }

  _processDroppedResources() {
    for (const resource of this.rc.find(FIND_DROPPED_RESOURCES)) {
      if (resource.amount > CONSTANTS.RESOURCES.DROPPED_MIN && !this._isTooCloseToController(resource.pos)) {
        this._addGivesResource({
          priority: CONSTANTS.PRIORITY.DROPPED_RESOURCE,
          resourceType: resource.resourceType,
          amount: resource.amount,
          id: resource.id,
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
  }

  _processLabs() {
    if (!this.rc.room.labs) return;
    
    for (const lab of this.rc.room.labs) {
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
  }

  _processFactory() {
    const factory = this.rc.room.factory;
    if (!factory) return;
    
    for (const resourceType of RESOURCES_ALL) {
      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "factory");
      const amount = ResourceManager.getResourceAmount(this.rc.room, resourceType, "factory");
      
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
  }

  _processStorage() {
    const storage = this.rc.room.storage;
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
          exact: true,
        });
      }
    }
  }

  _processTerminal() {
    const terminal = this.rc.room.terminal;
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

  _getControllerPriority() {
    if (!this.rc.room.controller) {
      return CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
    }
    
    const ticksToDowngrade = this.rc.room.controller.ticksToDowngrade;
    if (ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_CRITICAL) {
      return CONSTANTS.PRIORITY.CONTROLLER_CRITICAL;
    } else if (ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_LOW) {
      return CONSTANTS.PRIORITY.CONTROLLER_LOW;
    }
    
    return CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
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
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_MID,
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
          priority: CONSTANTS.PRIORITY.LAB_FILL,
          resourceType: resourceType,
          structureType: lab.structureType,
          amount: freeCapacity,
          id: lab.id,
        });
      }
    }
  }

  _processStructures() {
    if (!this.rc.room.controller || !this.rc.room.controller.my) return;
    
    // Determine tower priority based on enemies
    const towerPriority = this.rc.structures.getEnemys().length > 0 
      ? CONSTANTS.PRIORITY.TOWER_ENEMY 
      : CONSTANTS.PRIORITY.TOWER_NORMAL;
    
    // Process towers
    const towerNeeds = this.rc.structures.structuresNeedResource(this.rc.room.towers, RESOURCE_ENERGY, towerPriority, 400);
    for (const need of towerNeeds) {
      this._addNeedsResource(need);
    }
    
    // Process spawns
    const spawnNeeds = this.rc.structures.structuresNeedResource(this.rc.room.spawns, RESOURCE_ENERGY, CONSTANTS.PRIORITY.SPAWN);
    for (const need of spawnNeeds) {
      this._addNeedsResource(need);
    }
    
    // Process extensions
    const extensionNeeds = this.rc.structures.structuresNeedResource(this.rc.room.extensions, RESOURCE_ENERGY, CONSTANTS.PRIORITY.EXTENSION);
    for (const need of extensionNeeds) {
      this._addNeedsResource(need);
    }
    
    // Process labs (for energy)
    const labNeeds = this.rc.structures.structuresNeedResource(this.rc.room.labs, RESOURCE_ENERGY, CONSTANTS.PRIORITY.LAB);
    for (const need of labNeeds) {
      this._addNeedsResource(need);
    }
    
    // Process power spawn
    if (this.rc.room.powerSpawn) {
      const powerSpawnEnergyNeeds = this.rc.structures.structuresNeedResource([this.rc.room.powerSpawn], RESOURCE_ENERGY, CONSTANTS.PRIORITY.POWER_SPAWN_ENERGY, 400);
      for (const need of powerSpawnEnergyNeeds) {
        this._addNeedsResource(need);
      }
      
      const powerSpawnPowerNeeds = this.rc.structures.structuresNeedResource([this.rc.room.powerSpawn], RESOURCE_POWER, CONSTANTS.PRIORITY.POWER_SPAWN_POWER, 90);
      for (const need of powerSpawnPowerNeeds) {
        this._addNeedsResource(need);
      }
    }
    
    // Process nuker
    if (this.rc.room.nuker) {
      const nukerEnergyNeeds = this.rc.structures.structuresNeedResource([this.rc.room.nuker], RESOURCE_ENERGY, CONSTANTS.PRIORITY.NUKER_ENERGY);
      for (const need of nukerEnergyNeeds) {
        this._addNeedsResource(need);
      }
      
      const nukerGhodiumNeeds = this.rc.structures.structuresNeedResource([this.rc.room.nuker], RESOURCE_GHODIUM, CONSTANTS.PRIORITY.NUKER_GHODIUM);
      for (const need of nukerGhodiumNeeds) {
        this._addNeedsResource(need);
      }
    }
  }

  _processFactoryNeeds() {
    const factory = this.rc.room.factory;
    if (!factory || factory.store.getFreeCapacity() === 0) return;
    
    for (const resourceType of RESOURCES_ALL) {
      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "factory");
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
  }

  _processStorageNeeds() {
    const storage = this.rc.room.storage;
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
          exact: true,
        });
      }
    }
  }

  _processTerminalNeeds() {
    const terminal = this.rc.room.terminal;
    if (!terminal || terminal.store.getFreeCapacity() === 0) return;
    
    const energyThreshold = this.rc.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
    const freeCapacity = terminal.store.getFreeCapacity();
    
    for (const resourceType of RESOURCES_ALL) {
      const currentAmount = ResourceManager.getResourceAmount(this.rc.room, resourceType, "terminal");
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
        const fillLevel = this.rc.room.getRoomThreshold(resourceType, "terminal");
        if (currentAmount < fillLevel || currentAmount === 0) {
          priority = CONSTANTS.PRIORITY.TERMINAL_MINERAL;
          neededAmount = Math.min(fillLevel - currentAmount, freeCapacity);
          // Test Overwrite
          neededAmount = 6666;
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
      this._processStructures();
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
