const ResourceManager = require("./service.resource");
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

class LogisticsManager {
  constructor(roomController) {
    this.rc = roomController;
  }

  getTransportOrder(Creep) {
    const givesResources = this.givesResources();
    const needsResources = this.needsResources();

    // Check if creep is empty
    if (Creep.store.getUsedCapacity() > 0) {
      return null;
    }

    // Cache expensive operations
    const allCreeps = this.rc.creeps.getAllCreeps();
    const creepPos = Creep.pos;

    // Pre-compute blocked give sources (empty creeps collecting resources)
    const blockedGiveIds = new Set(
      allCreeps
        .filter(c => c.memory.target && c.store.getUsedCapacity() === 0)
        .map(c => c.memory.target),
    );

    const matchingOrders = [];

    for (const give of givesResources) {
      // Skip if source is already blocked
      if (blockedGiveIds.has(give.id)) continue;

      for (const need of needsResources) {
        // Basic compatibility check
        if (give.resourceType !== need.resourceType) continue;
        if (need.id === give.id) continue;

        // PRIORITY CHECK: Only match if need.priority < give.priority (same as showLogistic)
        if (need.priority >= give.priority) continue;

        // Validate target first (this also gets the object)
        const targetValidation = this._validateResourceTarget(need.id, need.resourceType);
        if (!targetValidation) continue;

        // Get give object (only if we have a valid match)
        const giveObj = Game.getObjectById(give.id);
        if (!giveObj) continue;

        // Calculate distances using cached objects
        const giveDistance = creepPos.getRangeTo(giveObj);
        const needDistance = creepPos.getRangeTo(targetValidation.obj);
        const totalDistance = giveDistance + needDistance;

        // Add to matching orders
        matchingOrders.push({
          give: give,
          need: need,
          priority: need.priority,
          totalDistance: totalDistance,
          needDistance: needDistance, // Prefer closer needs
        });
      }
    }

    // Early return if no matches
    if (matchingOrders.length === 0) {
      return null;
    }

    // Sort by priority (lowest first), then by distance (closest first)
    matchingOrders.sort((a, b) => {
      // Primary sort: priority
      if (a.priority !== b.priority) {
        return (a.priority || 0) - (b.priority || 0);
      }
      // Secondary sort: total distance (give + need)
      if (a.totalDistance !== b.totalDistance) {
        return a.totalDistance - b.totalDistance;
      }
      // Tertiary sort: need distance (prefer closer needs)
      return a.needDistance - b.needDistance;
    });

    // Return first matching order
    const order = matchingOrders[0];
    order.give.orderType = "G";
    this._updateCreepResourceMemory(Creep, order.give.resourceType, order.give.id, order.give.orderType, 0);

    return order.give;
  }

  getDeliveryOrder(Creep, resourceType = null) {
    const givesResources = this.givesResources(); // Need to check priority
    const needsResources = this.needsResources();

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
      // Use Object.keys() for better performance than for...in
      for (const resType of Object.keys(Creep.store)) {
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
    // Cache getAllCreeps() to avoid repeated calls in nested loop
    const allCreeps = this.rc.creeps.getAllCreeps();
    const matchingOrders = [];
    const creepPos = Creep.pos; // Cache creep position for distance calculation

    for (const resType of resourcesToCheck) {
      if (Creep.store[resType] <= 0) continue;

      // Find corresponding give for this resource type to check priority
      const correspondingGive = givesResources.find(g => g.resourceType === resType && g.id !== Creep.id);

      for (const need of needsResources) {

        // Basic compatibility check
        if (need.resourceType !== resType) continue;
        if (need.id === Creep.id) continue;

        // PRIORITY CHECK: Only match if need.priority < give.priority (same as showLogistic)
        if (correspondingGive && need.priority >= correspondingGive.priority) continue;

        // Only block if a creep WITH RESOURCES is already targeting this destination (creeps with resources deliver)
        // Use cached allCreeps instead of calling getAllCreeps() again
        if (allCreeps.some(c => c.memory.target === need.id && c.store.getUsedCapacity() > 0)) continue;

        // Check if target still exists and has capacity
        const targetValidation = this._validateResourceTarget(need.id, resType);
        if (!targetValidation) continue;

        // Calculate distance for secondary sorting
        const needObj = Game.getObjectById(need.id);
        const needDistance = needObj ? creepPos.getRangeTo(needObj) : 999;

        // Found matching order - set orderType and add to list with distance
        need.orderType = "D";
        need._sortDistance = needDistance; // Store distance for sorting

        // Update Creep.memory.resources with orderType
        this._updateCreepResourceMemory(Creep, resType, need.id, need.orderType, Creep.store[resType] || 0);

        matchingOrders.push(need);
      }
    }

    // Sort by priority (lowest first), then by distance (closest first)
    matchingOrders.sort((a, b) => {
      // Primary sort: priority
      if (a.priority !== b.priority) {
        return (a.priority || 0) - (b.priority || 0);
      }
      // Secondary sort: distance (prefer closer needs)
      return (a._sortDistance || 999) - (b._sortDistance || 999);
    });

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

  /**
   * Get transport orders for ornithopter creeps
   * Implements intelligent batching: finds multiple give orders nearby and assigns matching need orders
   */
  getTransportOrderOrnithopter(creep) {
    // Check if creep already has active transport orders
    if (creep.memory.transport && Array.isArray(creep.memory.transport) && creep.memory.transport.length > 0) {
      // Already has active orders, don't assign new ones
      return creep.memory.transport;
    }

    // Check if creep is empty
    const isEmpty = creep.store.getUsedCapacity() === 0;
    if (!isEmpty) {
      return null;
    }

    const givesResources = this.givesResources();
    const needsResources = this.needsResources();
    const allCreeps = this.rc.creeps.getAllCreeps();
    const creepPos = creep.pos;

    // Get all ornithopter creeps to check for already assigned orders
    const ornithopters = allCreeps.filter(c => c.memory.role === "ornithopter");
    const assignedGiveIds = new Set();
    const assignedNeedIds = new Set();

    // Collect already assigned orders from other ornithopters
    for (const ornithopter of ornithopters) {
      if (ornithopter.id === creep.id) continue;
      if (!ornithopter.memory.transport || !Array.isArray(ornithopter.memory.transport)) continue;

      for (const order of ornithopter.memory.transport) {
        if (order.type === "give") {
          assignedGiveIds.add(order.id);
        } else if (order.type === "need") {
          assignedNeedIds.add(order.id);
        }
      }
    }

    // Find all matching give-need pairs
    const matchingPairs = [];
    for (const give of givesResources) {
      // Skip if already assigned to another ornithopter
      if (assignedGiveIds.has(give.id)) continue;

      // Skip if already assigned to a transporter (empty creeps collect resources)
      if (allCreeps.some(c => c.memory.target === give.id && c.store.getUsedCapacity() === 0 && c.memory.role !== "ornithopter")) {
        continue;
      }

      const giveObj = Game.getObjectById(give.id);
      if (!giveObj) continue;

      const giveDistance = creepPos.getRangeTo(giveObj);

      // Find matching needs for this give
      for (const need of needsResources) {
        if (give.resourceType !== need.resourceType) continue;
        if (need.id === give.id) continue;
        if (need.priority >= give.priority) continue; // Priority check
        if (assignedNeedIds.has(need.id)) continue; // Already assigned

        // Check if target still exists and has capacity
        const targetValidation = this._validateResourceTarget(need.id, need.resourceType);
        if (!targetValidation) continue;

        const needObj = Game.getObjectById(need.id);
        if (!needObj) continue;

        const needDistance = creepPos.getRangeTo(needObj);
        const totalDistance = giveDistance + needDistance;

        matchingPairs.push({
          give: give,
          need: need,
          priority: need.priority,
          totalDistance: totalDistance,
          giveDistance: giveDistance,
          needDistance: needDistance,
        });
      }
    }

    // Sort by priority, then by distance
    matchingPairs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (a.priority || 0) - (b.priority || 0);
      }
      return a.totalDistance - b.totalDistance;
    });

    if (matchingPairs.length === 0) {
      return null;
    }

    // Intelligent batching: collect multiple give orders
    const transportOrders = [];
    const usedGiveIds = new Set();
    const usedNeedIds = new Set();
    const MAX_DISTANCE_FOR_BATCHING = 10; // Maximum distance for batching nearby orders
    const creepCapacity = creep.store.getCapacity();

    // Start with first matching pair
    let currentPair = matchingPairs[0];
    let totalPlannedAmount = 0;

    while (currentPair && totalPlannedAmount < creepCapacity) {
      const give = currentPair.give;
      const need = currentPair.need;

      // Check if we can add this give order
      if (usedGiveIds.has(give.id)) {
        // Already used this give, find next pair with different give
        currentPair = matchingPairs.find(p => !usedGiveIds.has(p.give.id) && !usedNeedIds.has(p.need.id));
        continue;
      }

      // Calculate how much we can take from this give
      const giveObj = Game.getObjectById(give.id);
      if (!giveObj) {
        currentPair = matchingPairs.find(p => !usedGiveIds.has(p.give.id) && !usedNeedIds.has(p.need.id));
        continue;
      }

      const availableAmount = giveObj.store ? (giveObj.store[give.resourceType] || 0) : 0;
      const remainingCapacity = creepCapacity - totalPlannedAmount;
      const takeAmount = Math.min(availableAmount, remainingCapacity, give.amount || availableAmount);

      if (takeAmount <= 0) {
        currentPair = matchingPairs.find(p => !usedGiveIds.has(p.give.id) && !usedNeedIds.has(p.need.id));
        continue;
      }

      // Add give order
      const giveOrder = {
        type: "give",
        id: give.id,
        resourceType: give.resourceType,
        amount: takeAmount,
        priority: give.priority,
        roomName: giveObj.room ? giveObj.room.name : this.rc.room.name,
      };
      transportOrders.push(giveOrder);
      usedGiveIds.add(give.id);
      totalPlannedAmount += takeAmount;

      // Find all matching needs for this give order
      const matchingNeeds = matchingPairs
        .filter(p => p.give.id === give.id && !usedNeedIds.has(p.need.id))
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return (a.priority || 0) - (b.priority || 0);
          }
          return a.needDistance - b.needDistance;
        });

      // Add need orders for this give
      let remainingFromGive = takeAmount;
      for (const needPair of matchingNeeds) {
        if (remainingFromGive <= 0) break;

        const need = needPair.need;
        const needObj = Game.getObjectById(need.id);
        if (!needObj) continue;

        const targetValidation = this._validateResourceTarget(need.id, need.resourceType);
        if (!targetValidation) continue;

        const needAmount = Math.min(need.amount || targetValidation.freeCapacity, remainingFromGive, targetValidation.freeCapacity);

        if (needAmount > 0) {
          const needOrder = {
            type: "need",
            id: need.id,
            resourceType: need.resourceType,
            amount: needAmount,
            priority: need.priority,
            roomName: needObj.room ? needObj.room.name : this.rc.room.name,
          };
          transportOrders.push(needOrder);
          usedNeedIds.add(need.id);
          remainingFromGive -= needAmount;
        }
      }

      // Look for additional give orders nearby (batching)
      if (totalPlannedAmount < creepCapacity) {
        const nearbyPairs = matchingPairs.filter(p => {
          if (usedGiveIds.has(p.give.id)) return false;
          if (usedNeedIds.has(p.need.id)) return false;

          const nearbyGiveObj = Game.getObjectById(p.give.id);
          if (!nearbyGiveObj) return false;

          const distanceToGive = giveObj.pos.getRangeTo(nearbyGiveObj.pos);
          return distanceToGive <= MAX_DISTANCE_FOR_BATCHING;
        });

        if (nearbyPairs.length > 0) {
          // Sort by priority and distance
          nearbyPairs.sort((a, b) => {
            if (a.priority !== b.priority) {
              return (a.priority || 0) - (b.priority || 0);
            }
            const aDist = giveObj.pos.getRangeTo(Game.getObjectById(a.give.id).pos);
            const bDist = giveObj.pos.getRangeTo(Game.getObjectById(b.give.id).pos);
            return aDist - bDist;
          });

          currentPair = nearbyPairs[0];
        } else {
          currentPair = null;
        }
      } else {
        currentPair = null;
      }
    }

    // Store orders in creep memory
    if (transportOrders.length > 0) {
      creep.memory.transport = transportOrders;

      // Log assigned orders
      const orderSummary = transportOrders.map(order => {
        const obj = Game.getObjectById(order.id);
        const objName = obj ? (obj.structureType || obj.constructor.name || "Object") : "Unknown";
        return `${order.type}: ${objName} (${order.resourceType}: ${order.amount})`;
      }).join(", ");

      Log.info(`${creep} Zugewiesen: [${orderSummary}]`, "transport");
    }

    return transportOrders;
  }

  /**
   * Get delivery orders for ornithopter creeps that have resources
   */
  getDeliveryOrderOrnithopter(creep) {
    // Get resources the creep is carrying
    const carriedResources = [];
    for (const resourceType of Object.keys(creep.store)) {
      if (creep.store[resourceType] > 0) {
        carriedResources.push(resourceType);
      }
    }

    if (carriedResources.length === 0) {
      return null;
    }

    const needsResources = this.needsResources();
    const allCreeps = this.rc.creeps.getAllCreeps();
    const creepPos = creep.pos;

    // Get all ornithopter creeps to check for already assigned orders
    const ornithopters = allCreeps.filter(c => c.memory.role === "ornithopter");
    const assignedNeedIds = new Set();

    // Collect already assigned need orders from other ornithopters
    for (const ornithopter of ornithopters) {
      if (ornithopter.id === creep.id) continue;
      if (!ornithopter.memory.transport || !Array.isArray(ornithopter.memory.transport)) continue;

      for (const order of ornithopter.memory.transport) {
        if (order.type === "need") {
          assignedNeedIds.add(order.id);
        }
      }
    }

    // Find matching need orders
    const matchingNeeds = [];
    for (const resType of carriedResources) {
      if (creep.store[resType] <= 0) continue;

      for (const need of needsResources) {
        if (need.resourceType !== resType) continue;
        if (need.id === creep.id) continue;
        if (assignedNeedIds.has(need.id)) continue;

        // Check if target still exists and has capacity
        const targetValidation = this._validateResourceTarget(need.id, resType);
        if (!targetValidation) continue;

        // Skip if another creep is already targeting this
        if (allCreeps.some(c => c.memory.target === need.id && c.store.getUsedCapacity() > 0 && c.id !== creep.id)) {
          continue;
        }

        const needObj = Game.getObjectById(need.id);
        if (!needObj) continue;

        const needDistance = creepPos.getRangeTo(needObj);

        matchingNeeds.push({
          need: need,
          priority: need.priority,
          distance: needDistance,
          resourceType: resType,
        });
      }
    }

    // Sort by priority, then by distance
    matchingNeeds.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (a.priority || 0) - (b.priority || 0);
      }
      return a.distance - b.distance;
    });

    // Add need orders to transport memory
    if (matchingNeeds.length > 0 && (!creep.memory.transport || !Array.isArray(creep.memory.transport))) {
      creep.memory.transport = [];
    }

    for (const match of matchingNeeds) {
      const need = match.need;
      const needObj = Game.getObjectById(need.id);
      if (!needObj) continue;

      const targetValidation = this._validateResourceTarget(need.id, match.resourceType);
      if (!targetValidation) continue;

      const needAmount = Math.min(
        match.need.amount || targetValidation.freeCapacity,
        creep.store[match.resourceType] || 0,
        targetValidation.freeCapacity
      );

      if (needAmount > 0) {
        const needOrder = {
          type: "need",
          id: need.id,
          resourceType: match.resourceType,
          amount: needAmount,
          priority: need.priority,
          roomName: needObj.room ? needObj.room.name : this.rc.room.name,
        };

        creep.memory.transport.push(needOrder);
      }
    }

    return creep.memory.transport ? creep.memory.transport.filter(o => o.type === "need") : null;
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

  _updateCreepResourceMemory(creep, resourceType, targetId, orderType, amount) {
    if (!creep.memory.resources) {
      creep.memory.resources = [];
    }

    const resourceEntry = creep.memory.resources.find(r => r.resourceType === resourceType);
    if (resourceEntry) {
      resourceEntry.orderType = orderType;
      if (targetId) resourceEntry.target = targetId;
      if (amount !== undefined) resourceEntry.amount = amount;
    } else {
      creep.memory.resources.push({
        resourceType: resourceType,
        amount: amount !== undefined ? amount : 0,
        target: targetId || null,
        orderType: orderType,
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
          amount: amount,
        };
      } else {
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW,
          amount: amount - fillLevel,
        };
      }
    } else {
      // Minerals
      if (amount > fillLevel) {
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_MINERAL_OVERFLOW,
          amount: amount - fillLevel,
        };
      } else {
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_MINERAL_HIGH,
          amount: amount,
        };
      }
    }
  }

  _getStorageNeedsPriority(resourceType, currentAmount, fillLevel) {
    if (resourceType === RESOURCE_ENERGY) {
      if (currentAmount < fillLevel) {
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_MID,
          amount: fillLevel - currentAmount,
        };
      } else if (currentAmount < CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD) {
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW,
          amount: CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD - currentAmount,
        };
      }
      return null; // Skip if already at max
    } else {
      // Minerals
      if (currentAmount < fillLevel) {
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_MINERAL,
          amount: fillLevel - currentAmount,
        };
      }
      return null; // Skip if already at fill level
    }
  }

  _getTerminalGivesPriority(resourceType, amount, energyThreshold) {
    if (resourceType === RESOURCE_ENERGY) {
      if (amount <= 0) {
        return null; // Skip if no energy
      }
      if (amount <= energyThreshold) {
        return {
          priority: CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW,
          amount: amount,
        };
      } else {
        return {
          priority: CONSTANTS.PRIORITY.TERMINAL_ENERGY_HIGH,
          amount: amount - energyThreshold,
        };
      }
    } else {
      // Minerals
      if (amount > 0) {
        return {
          priority: CONSTANTS.PRIORITY.TERMINAL_MINERAL,
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
      CONSTANTS.PRIORITY.TOMBSTONE,
      "tombstone",
    );
  }

  _processRuins() {
    this._processStoreResources(
      FIND_RUINS,
      0,
      CONSTANTS.PRIORITY.RUIN,
      "ruin",
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

      // Use Object.keys() for better performance than for...in
      for (const resourceType of Object.keys(container.store)) {
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
    const {factory} = this.rc.room;
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
          exact: true,
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

  _getControllerPriority() {
    if (!this.rc.room.controller) {
      return CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
    }

    const {ticksToDowngrade} = this.rc.room.controller;
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
          priority: CONSTANTS.PRIORITY.CONSTRUCTOR,
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
    const {factory} = this.rc.room;
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
          exact: true,
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
          // neededAmount = 66666;
        } else {
          // Test Overwrite
          // neededAmount = 66666;
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
