const Behavior = require("./behavior.base");
const Log = require("./lib.log");

/**
 * Unified Transport Behavior
 * 
 * Combines get_resources and transfer_resources into one behavior.
 * Uses simplified memory: creep.memory.transportTarget and creep.memory.transportResource
 * 
 * Flow:
 * 1. If empty → get transport order → collect resource
 * 2. If has resources → find delivery target → transfer
 */
class TransportBehavior extends Behavior {
  constructor() {
    super("transport");
  }

  /**
   * When: Active if creep has resources OR has a pending target OR there might be work
   */
  when(creep, rc) {
    // If creep has resources, always active (need to deliver)
    if (creep.store.getUsedCapacity() > 0) {
      return true;
    }
    // If has pending target, continue
    if (creep.memory.transportTarget) {
      return true;
    }
    // Check if there are any resources to transport (cheap check)
    // Don't call expensive getTransportOrder() here - let work() handle it
    return rc._givesResources && rc._givesResources.length > 0;
  }

  /**
   * Completed: When creep is empty AND has no pending target
   */
  completed(creep, rc) {
    return creep.store.getUsedCapacity() === 0 && !creep.memory.transportTarget;
  }

  /**
   * Main work function
   */
  work(creep, rc) {
    if (creep.store.getUsedCapacity() === 0) {
      // Empty creep - collect resources
      this._collectResources(creep, rc);
    } else {
      // Has resources - deliver them
      this._deliverResources(creep, rc);
    }
  }

  // ========================================================================
  // COLLECT RESOURCES (was get_resources)
  // ========================================================================

  /**
   * Collect resources from source
   */
  _collectResources(creep, rc) {
    let targetId = creep.memory.transportTarget;
    let resourceType = creep.memory.transportResource;
    let orderAmount = creep.memory.transportAmount;

    // Get new order if no target
    if (!targetId) {
      const order = rc.getTransportOrder(creep);
      if (!order) {
        return;
      }
      targetId = order.id;
      resourceType = order.resourceType;
      orderAmount = order.amount;
      creep.memory.transportTarget = targetId;
      creep.memory.transportResource = resourceType;
      creep.memory.transportAmount = orderAmount;
    }

    const target = Game.getObjectById(targetId);
    if (!target) {
      this._clearTransportMemory(creep);
      return;
    }

    // Collect from target
    let result;
    if (target.store !== undefined) {
      // Structure/Tombstone/Ruin - withdraw
      const available = target.store[resourceType] || 0;
      const freeCapacity = creep.store.getFreeCapacity(resourceType) || 0;
      
      // Check if greedy pickup (containers near sources/minerals)
      const isGreedy = this._isGreedyContainer(target);
      
      // Use order amount only for non-greedy targets
      const requestedAmount = isGreedy ? available : (orderAmount || available);
      const amount = Math.min(available, freeCapacity, requestedAmount);

      if (amount <= 0) {
        this._clearTransportMemory(creep);
        return;
      }
      result = creep.withdraw(target, resourceType, amount);
    } else {
      // Dropped resource - pickup all (greedy)
      result = creep.pickup(target);
    }

    this._handleCollectResult(creep, target, resourceType, result);
  }

  /**
   * Handle collection result
   */
  _handleCollectResult(creep, target, resourceType, result) {
    switch (result) {
      case OK:
        // Success - clear target, keep resource type for delivery
        creep.memory.transportTarget = null;
        break;

      case ERR_NOT_IN_RANGE:
        creep.travelTo(target, { maxRooms: 1 });
        break;

      case ERR_INVALID_TARGET:
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} collect failed from ${target}: ${global.getErrorString(result)}`, "transport");
        this._clearTransportMemory(creep);
        break;

      case ERR_FULL:
        // Creep is full, proceed to delivery
        creep.memory.transportTarget = null;
        break;

      default:
        Log.warn(`${creep} unknown collect result: ${global.getErrorString(result)}`, "transport");
        this._clearTransportMemory(creep);
    }
  }

  // ========================================================================
  // DELIVER RESOURCES (was transfer_resources)
  // ========================================================================

  /**
   * Deliver resources to destination
   */
  _deliverResources(creep, rc) {
    let targetId = creep.memory.transportTarget;
    let orderAmount = creep.memory.transportAmount;

    // Find delivery target if none set
    if (!targetId) {
      const order = this._findDeliveryOrder(creep, rc);
      if (!order) {
        // Try fallbacks (no amount limit for fallbacks)
        const fallback = this._getFallbackTarget(creep);
        if (!fallback) {
          return;
        }
        targetId = fallback.id;
        orderAmount = null; // No limit for fallbacks
      } else {
        targetId = order.id;
        orderAmount = order.amount;
      }
      creep.memory.transportTarget = targetId;
      creep.memory.transportAmount = orderAmount;
    }

    const target = Game.getObjectById(targetId);
    if (!target) {
      creep.memory.transportTarget = null;
      creep.memory.transportAmount = null;
      return;
    }

    // Transfer resources (with amount limit if specified)
    this._transferResources(creep, target, orderAmount);
  }

  /**
   * Find best delivery order using logistics
   */
  _findDeliveryOrder(creep, rc) {
    const orders = rc.getDeliveryOrder(creep);

    if (!orders || (Array.isArray(orders) && orders.length === 0)) {
      return null;
    }

    // Single or first order
    return Array.isArray(orders) ? orders[0] : orders;
  }

  /**
   * Fallback targets: Terminal → Storage → Drop
   */
  _getFallbackTarget(creep) {
    // Terminal
    const terminal = creep.room.terminal;
    if (terminal && terminal.my && terminal.store.getFreeCapacity() > 0) {
      return terminal;
    }

    // Storage
    const storage = creep.room.storage;
    if (storage && storage.my && storage.store.getFreeCapacity() > 0) {
      return storage;
    }

    // Last resort: drop
    Log.warn(`${creep} dropping resources - no delivery target`, "transport");
    for (const resourceType of Object.keys(creep.store)) {
      if (creep.store[resourceType] > 0) {
        creep.drop(resourceType);
      }
    }
    return null;
  }

  /**
   * Transfer resources to target
   * @param {Creep} creep - Creep with resources
   * @param {Structure} target - Target structure
   * @param {number|null} orderAmount - Amount limit from order (null = transfer all)
   */
  _transferResources(creep, target, orderAmount) {
    // Energy first, then others
    const resources = Object.keys(creep.store)
      .filter(r => creep.store[r] > 0)
      .sort((a, b) => (a === RESOURCE_ENERGY ? -1 : b === RESOURCE_ENERGY ? 1 : 0));

    // Track total carried BEFORE transfers (store won't update until end of tick)
    const totalCarriedBefore = creep.store.getUsedCapacity();
    let totalTransferred = 0;

    for (const resourceType of resources) {
      const carried = creep.store[resourceType];
      if (carried <= 0) continue;

      // Calculate transfer amount
      let transferAmount = carried;
      
      // Respect target capacity
      if (target.store) {
        const free = target.store.getFreeCapacity(resourceType);
        if (free <= 0) continue;
        transferAmount = Math.min(transferAmount, free);
      }

      // Respect order amount limit if specified
      if (orderAmount !== null && orderAmount !== undefined) {
        const remaining = orderAmount - totalTransferred;
        if (remaining <= 0) {
          // Order fulfilled, find new target
          creep.memory.transportTarget = null;
          creep.memory.transportAmount = null;
          return;
        }
        transferAmount = Math.min(transferAmount, remaining);
      }

      const result = creep.transfer(target, resourceType, transferAmount);

      switch (result) {
        case OK:
          totalTransferred += transferAmount;
          // Continue with next resource if no amount limit or not yet fulfilled
          break;

        case ERR_NOT_IN_RANGE:
          creep.travelTo(target, { maxRooms: 1 });
          return;

        case ERR_FULL:
          // Target full, find new target
          creep.memory.transportTarget = null;
          creep.memory.transportAmount = null;
          return;

        case ERR_INVALID_TARGET:
        case ERR_NOT_ENOUGH_RESOURCES:
          creep.memory.transportTarget = null;
          creep.memory.transportAmount = null;
          return;

        default:
          Log.warn(`${creep} transfer error: ${global.getErrorString(result)}`, "transport");
          creep.memory.transportTarget = null;
          creep.memory.transportAmount = null;
          return;
      }
    }

    // Calculate expected remaining (store won't update until end of tick!)
    const expectedRemaining = totalCarriedBefore - totalTransferred;

    // All done or creep will be empty after this tick
    if (expectedRemaining <= 0) {
      // Creep will be empty - clear all transport memory
      this._clearTransportMemory(creep);
    } else if (totalTransferred === 0) {
      // Nothing transferred (target full for all carried resources) - find new target
      creep.memory.transportTarget = null;
      creep.memory.transportAmount = null;
    } else if (orderAmount !== null && totalTransferred >= orderAmount) {
      // Order fulfilled but creep still has resources - find new target
      creep.memory.transportTarget = null;
      creep.memory.transportAmount = null;
    }
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  /**
   * Check if target is a container near a source or mineral (greedy pickup)
   * Uses cached room data instead of expensive findInRange calls
   * @param {Structure} target - Target structure
   * @returns {boolean} True if container should use greedy pickup
   */
  _isGreedyContainer(target) {
    // Only containers can be greedy
    if (!target.structureType || target.structureType !== STRUCTURE_CONTAINER) {
      return false;
    }

    const room = target.room;
    if (!room) return false;

    // Check sources - use cached room.sources if available
    const sources = room.sources || room.find(FIND_SOURCES);
    for (const source of sources) {
      if (target.pos.inRangeTo(source, 2)) {
        return true;
      }
    }

    // Check mineral - use cached room.mineral if available
    const mineral = room.mineral;
    if (mineral && target.pos.inRangeTo(mineral, 2)) {
      return true;
    }

    return false;
  }

  /**
   * Clear transport-related memory
   */
  _clearTransportMemory(creep) {
    creep.memory.transportTarget = null;
    creep.memory.transportResource = null;
    creep.memory.transportAmount = null;
  }
}

module.exports = new TransportBehavior();
