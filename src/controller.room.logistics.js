const ResourceManager = require("./service.resource");
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

/**
 * LogisticsManager - Central coordinator for resource distribution
 * 
 * Manages two resource lists:
 * - givesResources: All sources that can provide resources
 * - needsResources: All destinations that need resources
 * 
 * Uses priority-based matching: need.priority < give.priority
 */
class LogisticsManager {
  /**
   * @param {ControllerRoom} roomController - Room controller instance
   */
  constructor(roomController) {
    this.rc = roomController;
  }

  // ========================================================================
  // PUBLIC API - Order Management
  // ========================================================================

  /**
   * Get transport order for an empty creep
   * OPTIMIZED: Groups needs by resourceType to reduce O(n×m) to O(n×k)
   * @param {Creep} Creep - Creep to get transport order for
   * @returns {Object|null} Transport order with give/need information, or null if no order available
   */
  getTransportOrder(Creep) {
    // Check if creep is empty
    if (Creep.store.getUsedCapacity() > 0) {
      return null;
    }

    const givesResources = this.givesResources();
    const needsResources = this.needsResources();

    // Early exit if nothing to do
    if (givesResources.length === 0 || needsResources.length === 0) {
      return null;
    }

    // OPTIMIZATION: Group needs by resourceType (do this once, not per give)
    const needsByType = {};
    for (const need of needsResources) {
      if (!needsByType[need.resourceType]) {
        needsByType[need.resourceType] = [];
      }
      needsByType[need.resourceType].push(need);
    }

    // Pre-compute blocked give sources (creeps already collecting)
    const allCreeps = this.rc.creeps.getAllCreeps();
    const blockedGiveIds = new Set();
    for (const c of allCreeps) {
      const targetId = c.memory.transportTarget || c.memory.target;
      if (targetId && c.store.getUsedCapacity() === 0) {
        blockedGiveIds.add(targetId);
      }
    }

    const creepPos = Creep.pos;
    let bestOrder = null;
    let bestScore = Infinity;

    // Iterate through gives (sorted by priority, highest first)
    for (const give of givesResources) {
      // Skip if blocked
      if (blockedGiveIds.has(give.id)) continue;

      // Get matching needs for this resource type
      const matchingNeeds = needsByType[give.resourceType];
      if (!matchingNeeds || matchingNeeds.length === 0) continue;

      // Validate give object once
      const giveObj = Game.getObjectById(give.id);
      if (!giveObj) continue;
      if (giveObj.store) {
        const currentAmount = giveObj.store[give.resourceType] || 0;
        if (currentAmount <= 0) continue;
      }

      const giveDistance = creepPos.getRangeTo(giveObj);

      // Find best matching need for this give
      for (const need of matchingNeeds) {
        if (need.id === give.id) continue;
        
        // Priority check: need.priority < give.priority
        if (need.priority >= give.priority) continue;

        // Calculate score (lower is better): priority * 1000 + distance
        const needObj = Game.getObjectById(need.id);
        if (!needObj) continue;
        
        // Quick capacity check
        if (needObj.store && needObj.store.getFreeCapacity(need.resourceType) <= 0) continue;

        const needDistance = creepPos.getRangeTo(needObj);
        const totalDistance = giveDistance + needDistance;
        const score = need.priority * 1000 + totalDistance;

        if (score < bestScore) {
          bestScore = score;
          bestOrder = { give, need, giveObj, needObj, totalDistance };
        }
      }
    }

    if (!bestOrder) {
      return null;
    }

    bestOrder.give.orderType = "G";
    return bestOrder.give;
  }

  /**
   * Get delivery order for a creep with resources
   * OPTIMIZED: Pre-computes blocked targets, groups needs by resourceType
   * @param {Creep} Creep - Creep carrying resources
   * @param {string|null} [resourceType=null] - Specific resource type to deliver, or null for all resources
   * @returns {Object|Array|null} Delivery order(s), or null if no order available
   */
  getDeliveryOrder(Creep, resourceType = null) {
    const needsResources = this.needsResources();

    // Get resources the creep is carrying
    const carriedResources = Object.keys(Creep.store).filter(resType => Creep.store[resType] > 0);
    if (carriedResources.length === 0) {
      return null;
    }

    // Filter by specific resource type if requested
    const resourcesToCheck = resourceType ? [resourceType] : carriedResources;

    // OPTIMIZATION: Pre-compute blocked delivery targets (creeps with resources targeting them)
    const allCreeps = this.rc.creeps.getAllCreeps();
    const blockedDeliveryIds = new Set();
    for (const c of allCreeps) {
      if (c.store.getUsedCapacity() > 0) {
        const targetId = c.memory.transportTarget || c.memory.target;
        if (targetId) blockedDeliveryIds.add(targetId);
      }
    }

    // OPTIMIZATION: Group needs by resourceType
    const needsByType = {};
    for (const need of needsResources) {
      if (!needsByType[need.resourceType]) {
        needsByType[need.resourceType] = [];
      }
      needsByType[need.resourceType].push(need);
    }

    const creepPos = Creep.pos;
    const matchingOrders = [];

    for (const resType of resourcesToCheck) {
      if (Creep.store[resType] <= 0) continue;

      // Get needs for this resource type only
      const needsForType = needsByType[resType];
      if (!needsForType) continue;

      for (const need of needsForType) {
        if (need.id === Creep.id) continue;

        // Skip if another creep with resources is targeting this
        if (blockedDeliveryIds.has(need.id)) continue;

        // Quick capacity check
        const needObj = Game.getObjectById(need.id);
        if (!needObj) continue;
        if (needObj.store && needObj.store.getFreeCapacity(resType) <= 0) continue;

        // Calculate distance
        const needDistance = creepPos.getRangeTo(needObj);

        // Clone need to avoid modifying original
        matchingOrders.push({
          ...need,
          orderType: "D",
          _sortDistance: needDistance,
        });
      }
    }

    // Sort by priority (lowest first), then by distance
    matchingOrders.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (a.priority || 0) - (b.priority || 0);
      }
      return (a._sortDistance || 999) - (b._sortDistance || 999);
    });

    // Return format
    if (matchingOrders.length > 0) {
      if (resourceType !== null) {
        return matchingOrders.find(o => o.resourceType === resourceType) || null;
      } else {
        return matchingOrders;
      }
    }

    return null;
  }

  /**
   * Get all resources that can be given (sources)
   * @returns {Array} Array of give resource orders, sorted by priority (highest first)
   */
  givesResources() {
    if (!this.rc._givesResources) {
      this.rc._givesResources = [];

      // Process all resource sources in priority order
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

  /**
   * Get all resources that are needed (destinations)
   * @returns {Array} Array of need resource orders, sorted by priority (lowest first = highest priority)
   */
  needsResources() {
    if (!this.rc._needsResources) {
      this.rc._needsResources = [];

      // Get controller priority (dynamic based on ticksToDowngrade)
      const controllerPriority = this._getControllerPriority();

      // Process all resource needs
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

  // ========================================================================
  // HELPER METHODS - Validation & Memory Management
  // ========================================================================

  /**
   * Validate that a resource target exists and has capacity
   * @param {string} targetId - Target object ID
   * @param {string} resourceType - Resource type to check capacity for
   * @returns {Object|null} Object with {obj, freeCapacity} or null if invalid
   */
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
   * Add a resource source entry to the gives list
   */
  _addGivesResource(entry) {
    if (!this.rc._givesResources) {
      this.rc._givesResources = [];
    }
    this.rc._givesResources.push(entry);
  }

  /**
   * Add a resource need entry to the needs list
   */
  _addNeedsResource(entry) {
    if (!this.rc._needsResources) {
      this.rc._needsResources = [];
    }
    this.rc._needsResources.push(entry);
  }

  /**
   * Check if position is too close to controller (avoid collecting dropped resources there)
   */
  _isTooCloseToController(pos) {
    if (!this.rc.room.controller) {
      return false;
    }
    return pos.inRangeTo(this.rc.room.controller.pos, CONSTANTS.CONTROLLER.RANGE_FOR_DROPPED_RESOURCES);
  }

  // ========================================================================
  // PRIORITY CALCULATION METHODS
  // ========================================================================

  /**
   * Determines priority for storage resource availability (gives) based on amount and fill level
   * 
   * Priority Logic:
   * - Energy:
   *   * At or below fillLevel → STORAGE_ENERGY_LOW priority (can give, but below ideal)
   *   * Above fillLevel → STORAGE_ENERGY_OVERFLOW priority (excess can be distributed)
   * - Minerals:
   *   * Above fillLevel → STORAGE_MINERAL_OVERFLOW priority (excess can be distributed)
   *   * At or below fillLevel → STORAGE_MINERAL_HIGH priority (can give, but try to maintain)
   * 
   * @param {string} resourceType - Resource type (RESOURCE_ENERGY or mineral)
   * @param {number} amount - Current amount in storage
   * @param {number} fillLevel - Target fill level from room configuration
   * @returns {Object} Object with {priority, amount} indicating what can be given
   */
  _getStorageGivesPriority(resourceType, amount, fillLevel) {
    if (resourceType === RESOURCE_ENERGY) {
      if (amount <= fillLevel) {
        // Storage has energy but below/at fill level - lower priority to give away
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_LOW,
          amount: amount,
        };
      } else {
        // Storage has excess energy above fill level - can give overflow
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW,
          amount: amount - fillLevel,
        };
      }
    } else {
      // Minerals
      if (amount > fillLevel) {
        // Storage has excess minerals above fill level - can give overflow
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_MINERAL_OVERFLOW,
          amount: amount - fillLevel,
        };
      } else {
        // Storage has minerals but at/below fill level - higher priority to maintain
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_MINERAL_HIGH,
          amount: amount,
        };
      }
    }
  }

  /**
   * Determines priority for storage resource needs based on current amount and fill level
   * 
   * PARAMETER EXPLANATION:
   * - currentAmount: IST-Zustand - wie viel Ressourcen aktuell im Storage sind (z.B. 15000)
   * - fillLevel: SOLL-Zustand - wie viel Ressourcen im Storage sein SOLLTEN (Zielwert aus Konfiguration)
   *              Example: 30000 for energy, 21000 for minerals
   *              Computed via room.getRoomThreshold(resourceType, "storage")
   * 
   * PRIORITY LOGIC:
   * - Energy: 
   *   * currentAmount < fillLevel → STORAGE_ENERGY_MID priority (normal need to reach target)
   *     Beispiel: currentAmount=15000, fillLevel=30000 → needs 15000 more
   *   * fillLevel <= currentAmount < MAX_ENERGY_THRESHOLD → STORAGE_ENERGY_OVERFLOW priority (fill to max)
   *     Beispiel: currentAmount=30000, fillLevel=30000, MAX=100000 → needs up to 70000 more (lower priority)
   *   * currentAmount >= MAX_ENERGY_THRESHOLD → null (no need, already at max)
   * - Minerals:
   *   * currentAmount < fillLevel → STORAGE_MINERAL priority (normal need to reach target)
   *     Beispiel: currentAmount=10000, fillLevel=21000 → needs 11000 more
   *   * currentAmount >= fillLevel → null (no need, already at fill level)
   * 
   * @param {string} resourceType - Resource type (RESOURCE_ENERGY or mineral)
   * @param {number} currentAmount - Current amount in storage (IST-Zustand)
   * @param {number} fillLevel - Target fill level from room configuration (SOLL-Zustand)
   * @returns {Object|null} Object with {priority, amount} or null if no need
   */
  _getStorageNeedsPriority(resourceType, currentAmount, fillLevel) {
    if (resourceType === RESOURCE_ENERGY) {
      // Energy: Three-tier priority system
      if (currentAmount < fillLevel) {
        // Below target fill level - normal priority to reach target
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_MID,
          amount: fillLevel - currentAmount,
        };
      } else if (currentAmount < CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD) {
        // Between fill level and max threshold - lower priority to fill beyond target
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_ENERGY_OVERFLOW,
          amount: CONSTANTS.STORAGE.MAX_ENERGY_THRESHOLD - currentAmount,
        };
      }
      // Already at or above max threshold - no need
      return null;
    } else {
      // Minerals: Simple two-tier system
      if (currentAmount < fillLevel) {
        // Below fill level - normal priority to reach target
        return {
          priority: CONSTANTS.PRIORITY.STORAGE_MINERAL,
          amount: fillLevel - currentAmount,
        };
      }
      // Already at or above fill level - no need
      return null;
    }
  }

  /**
   * Determines priority for terminal resource availability (gives) based on amount and threshold
   * 
   * Priority Logic:
   * - Energy:
   *   * No energy → null (can't give)
   *   * At or below energyThreshold → TERMINAL_ENERGY_LOW priority (can give, but low)
   *   * Above energyThreshold → TERMINAL_ENERGY_HIGH priority (can give excess)
   * - Minerals:
   *   * Has minerals → TERMINAL_MINERAL priority (can give all)
   *   * No minerals → null (can't give)
   * 
   * @param {string} resourceType - Resource type (RESOURCE_ENERGY or mineral)
   * @param {number} amount - Current amount in terminal
   * @param {number} energyThreshold - Energy threshold for terminal (below this = low priority)
   * @returns {Object|null} Object with {priority, amount} or null if can't give
   */
  _getTerminalGivesPriority(resourceType, amount, energyThreshold) {
    if (resourceType === RESOURCE_ENERGY) {
      if (amount <= 0) {
        return null; // Skip if no energy to give
      }
      if (amount <= energyThreshold) {
        // Terminal has energy but below threshold - lower priority to give
        return {
          priority: CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW,
          amount: amount,
        };
      } else {
        // Terminal has excess energy above threshold - can give overflow
        return {
          priority: CONSTANTS.PRIORITY.TERMINAL_ENERGY_HIGH,
          amount: amount - energyThreshold,
        };
      }
    } else {
      // Minerals: Terminal can give all minerals (they're usually for trading)
      if (amount > 0) {
        return {
          priority: CONSTANTS.PRIORITY.TERMINAL_MINERAL,
          amount: amount,
        };
      }
      return null; // Skip if no minerals to give
    }
  }

  /**
   * Determines controller priority based on ticks until downgrade
   * 
   * Priority tiers:
   * - < 100 ticks → CONTROLLER_CRITICAL (highest priority, prevent downgrade)
   * - < 5000 ticks → CONTROLLER_LOW (medium priority, maintain level)
   * - >= 5000 ticks → STORAGE_ENERGY_HIGH (normal priority, no urgent need)
   * 
   * @returns {number} Priority value for controller/upgrader energy needs
   */
  _getControllerPriority() {
    if (!this.rc.room.controller) {
      // No controller - return normal priority (shouldn't happen in owned rooms)
      return CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
    }

    const {ticksToDowngrade} = this.rc.room.controller;
    if (ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_CRITICAL) {
      // Critical: Controller will downgrade soon - highest priority
      return CONSTANTS.PRIORITY.CONTROLLER_CRITICAL;
    } else if (ticksToDowngrade < CONSTANTS.CONTROLLER.TICKS_TO_DOWNGRADE_LOW) {
      // Low: Controller needs energy but not critical - medium priority
      return CONSTANTS.PRIORITY.CONTROLLER_LOW;
    }

    // Normal: Controller has enough time - normal priority
    return CONSTANTS.PRIORITY.STORAGE_ENERGY_HIGH;
  }

  // ========================================================================
  // GIVES RESOURCES PROCESSING - Resource Sources
  // ========================================================================

  /**
   * Process generic store resources (tombstones, ruins)
   */
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

  /**
   * Process tombstone resources
   */
  _processTombstones() {
    this._processStoreResources(
      FIND_TOMBSTONES,
      CONSTANTS.RESOURCES.TOMBSTONE_MIN,
      CONSTANTS.PRIORITY.TOMBSTONE,
      "tombstone",
    );
  }

  /**
   * Process ruin resources (destroyed structures)
   */
  _processRuins() {
    this._processStoreResources(
      FIND_RUINS,
      0,
      CONSTANTS.PRIORITY.RUIN,
      "ruin",
    );
  }

  /**
   * Process link resources (receiver links only)
   */
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

  /**
   * Process dropped resources on the ground
   */
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

  /**
   * Process container resources (at sources and extractor)
   */
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

  /**
   * Process lab resources (labs with status "empty" that need emptying)
   */
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

  /**
   * Process factory overflow resources
   * OPTIMIZED: Only check resources actually in factory
   */
  _processFactory() {
    const {factory} = this.rc.room;
    if (!factory) return;

    for (const resourceType of Object.keys(factory.store)) {
      const amount = factory.store[resourceType] || 0;
      if (amount === 0) continue;
      
      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "factory");

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

  /**
   * Process storage resources (with priority based on fill level)
   * OPTIMIZED: Only check resources actually in storage
   */
  _processStorage() {
    const {storage} = this.rc.room;
    if (!storage) return;

    for (const resourceType of Object.keys(storage.store)) {
      const amount = storage.store[resourceType] || 0;
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

  /**
   * Process terminal resources (with priority based on energy threshold)
   * OPTIMIZED: Only check resources actually in terminal
   */
  _processTerminal() {
    const {terminal} = this.rc.room;
    if (!terminal) return;

    const energyThreshold = this.rc.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");

    for (const resourceType of Object.keys(terminal.store)) {
      const amount = terminal.store[resourceType] || 0;
      if (amount === 0) continue;
      
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

  // ========================================================================
  // NEEDS RESOURCES PROCESSING - Resource Destinations
  // ========================================================================

  /**
   * Process upgrader creeps that need energy
   */
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

  /**
   * Process controller container that needs energy
   */
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

  /**
   * Process constructor creeps that need energy
   */
  _processConstructors() {
    const constructors = this.rc.creeps.getCreeps("constructor");
    for (const constructor of constructors) {
      const freeCapacity = constructor.store.getFreeCapacity(RESOURCE_ENERGY);
      const capacity = constructor.store.getCapacity();

      // Only add need if constructor has significant free capacity
      // This prevents micro-management and focuses on creeps that actually need energy
      if (freeCapacity > capacity * CONSTANTS.CREEP_LIFECYCLE.CONSTRUCTOR_CAPACITY_THRESHOLD) {
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

  /**
   * Process labs that need resources (status "fill")
   */
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

  /**
   * Process structure needs (towers, spawns, extensions, labs, power spawn, nuker)
   */
  _processStructures() {
    if (!this.rc.room.controller || !this.rc.room.controller.my) return;

    // Determine tower priority based on enemies
    const towerPriority = this.rc.structures.getEnemies().length > 0
      ? CONSTANTS.PRIORITY.TOWER_ENEMY
      : CONSTANTS.PRIORITY.TOWER_NORMAL;

    // Process towers
    // Towers need energy if below threshold (below this amount = needs refill)
    const towerNeeds = this.rc.structures.structuresNeedResource(
      this.rc.room.towers, 
      RESOURCE_ENERGY, 
      towerPriority, 
      CONSTANTS.STRUCTURE_ENERGY.TOWER_ENERGY_THRESHOLD
    );
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
      // Power spawn needs energy if below threshold
      const powerSpawnEnergyNeeds = this.rc.structures.structuresNeedResource(
        [this.rc.room.powerSpawn], 
        RESOURCE_ENERGY, 
        CONSTANTS.PRIORITY.POWER_SPAWN_ENERGY, 
        CONSTANTS.STRUCTURE_ENERGY.POWER_SPAWN_ENERGY_THRESHOLD
      );
      for (const need of powerSpawnEnergyNeeds) {
        this._addNeedsResource(need);
      }

      // Power spawn needs power if below threshold (needed for processing power)
      const powerSpawnPowerNeeds = this.rc.structures.structuresNeedResource(
        [this.rc.room.powerSpawn], 
        RESOURCE_POWER, 
        CONSTANTS.PRIORITY.POWER_SPAWN_POWER, 
        CONSTANTS.STRUCTURE_ENERGY.POWER_SPAWN_POWER_THRESHOLD
      );
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

  /**
   * OPTIMIZED: Only check energy + resources in storage/terminal
   */
  _processFactoryNeeds() {
    const {factory} = this.rc.room;
    if (!factory || factory.store.getFreeCapacity() === 0) return;

    // Only check energy + resources available in room
    const resourcesToCheck = [RESOURCE_ENERGY];
    if (this.rc.room.storage) {
      for (const res of Object.keys(this.rc.room.storage.store)) {
        if (!resourcesToCheck.includes(res)) resourcesToCheck.push(res);
      }
    }
    if (this.rc.room.terminal) {
      for (const res of Object.keys(this.rc.room.terminal.store)) {
        if (!resourcesToCheck.includes(res)) resourcesToCheck.push(res);
      }
    }

    for (const resourceType of resourcesToCheck) {
      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "factory");
      if (fillLevel === 0) continue; // Skip resources not configured for factory
      
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

  /**
   * Process storage resource needs (with priority based on fill level)
   * OPTIMIZED: Only check energy + resources already in room
   */
  _processStorageNeeds() {
    const {storage} = this.rc.room;
    if (!storage || storage.store.getFreeCapacity() === 0) return;

    // Only check energy + resources that exist somewhere in the room
    const resourcesToCheck = [RESOURCE_ENERGY];
    
    // Add resources from terminal (if exists)
    if (this.rc.room.terminal) {
      for (const res of Object.keys(this.rc.room.terminal.store)) {
        if (!resourcesToCheck.includes(res)) resourcesToCheck.push(res);
      }
    }
    // Add resources from storage itself
    for (const res of Object.keys(storage.store)) {
      if (!resourcesToCheck.includes(res)) resourcesToCheck.push(res);
    }
    // Add resources from labs (e.g. status "empty") so storage registers a need and transport is scheduled
    if (this.rc.room.labs) {
      for (const lab of this.rc.room.labs) {
        if (!lab.store) continue;
        for (const res of Object.keys(lab.store)) {
          if (res !== RESOURCE_ENERGY && (lab.store[res] || 0) > 0 && !resourcesToCheck.includes(res)) {
            resourcesToCheck.push(res);
          }
        }
      }
    }

    for (const resourceType of resourcesToCheck) {
      const fillLevel = this.rc.room.getRoomThreshold(resourceType, "storage");
      const currentAmount = storage.store[resourceType] || 0;
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

  /**
   * OPTIMIZED: Only check energy + resources already in room
   */
  _processTerminalNeeds() {
    const {terminal} = this.rc.room;
    if (!terminal || terminal.store.getFreeCapacity() === 0) return;

    const energyThreshold = this.rc.room.getRoomThreshold(RESOURCE_ENERGY, "terminal");
    const freeCapacity = terminal.store.getFreeCapacity();

    // Only check energy + resources that exist somewhere in the room
    const resourcesToCheck = [RESOURCE_ENERGY];
    
    // Add resources from storage (if exists)
    if (this.rc.room.storage) {
      for (const res of Object.keys(this.rc.room.storage.store)) {
        if (!resourcesToCheck.includes(res)) resourcesToCheck.push(res);
      }
    }
    // Add resources from terminal itself
    for (const res of Object.keys(terminal.store)) {
      if (!resourcesToCheck.includes(res)) resourcesToCheck.push(res);
    }

    for (const resourceType of resourcesToCheck) {
      const currentAmount = terminal.store[resourceType] || 0;
      let priority;
      let neededAmount;

      if (resourceType === RESOURCE_ENERGY) {
        if (currentAmount < energyThreshold) {
          priority = CONSTANTS.PRIORITY.TERMINAL_ENERGY_LOW;
          neededAmount = Math.min(energyThreshold - currentAmount, freeCapacity);
        } else {
          if (freeCapacity > 0) {
            priority = CONSTANTS.PRIORITY.TERMINAL_ENERGY_OVERFLOW;
            neededAmount = freeCapacity;
          } else {
            continue;
          }
        }
      } else {
        if (freeCapacity <= 0) {
          continue;
        }
        const fillLevel = this.rc.room.getRoomThreshold(resourceType, "terminal");
        if (currentAmount < fillLevel) {
          priority = CONSTANTS.PRIORITY.TERMINAL_MINERAL;
          neededAmount = Math.min(fillLevel - currentAmount, freeCapacity);
        } else {
          priority = CONSTANTS.PRIORITY.TERMINAL_MINERAL;
          neededAmount = freeCapacity;
        }
      }

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
}

module.exports = LogisticsManager;
