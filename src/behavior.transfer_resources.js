const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const CONSTANTS = require("./config.constants");

/**
 * Simplified Transfer Resources Behavior
 * 
 * CLEANER DESIGN:
 * - Single responsibility: Transfer resources to best available target
 * - Less fallback logic: Trust the logistics manager
 * - Simpler memory: Store target, not complex resource arrays
 * - Better error handling: Clear state on errors
 */
class TransferResourcesBehavior extends Behavior {
  constructor() {
    super("transfer_resources");
  }

  /**
   * When: Active if creep has resources
   */
  when(creep, rc) {
    return creep.store.getUsedCapacity() > 0;
  }

  /**
   * Completed: When creep is empty
   */
  completed(creep, rc) {
    return creep.store.getUsedCapacity() === 0;
  }

  /**
   * Work: Transfer resources to best target
   */
  work(creep, rc) {
    // Get current target
    let target = creep.getTarget();
    
    // Validate or get new target
    if (!this._isTargetValid(creep, target)) {
      target = this._findBestTarget(creep, rc);
      if (!target) {
        // No valid target - try fallbacks: Terminal → Storage → Drop
        target = this._getFallbackTarget(creep);
        if (!target) {
          Log.warn(`${creep} has resources but no valid delivery target and all fallbacks failed`, "transfer_resources");
          return;
        }
      }
      creep.target = target.id;
    }

    // Transfer all resources to target
    this._transferAllResources(creep, target);
  }

  /**
   * Check if current target is still valid
   */
  _isTargetValid(creep, target) {
    if (!target) return false;
    
    const targetObj = Game.getObjectById(target.id);
    if (!targetObj) return false;

    // Check if target can accept any resource we're carrying
    for (const resourceType of Object.keys(creep.store)) {
      const amount = creep.store[resourceType];
      if (amount > 0) {
        if (targetObj.store) {
          const freeCapacity = targetObj.store.getFreeCapacity(resourceType);
          if (freeCapacity > 0) return true;
        } else {
          // No store (e.g., controller) - valid if we have energy
          if (resourceType === RESOURCE_ENERGY) return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Find best delivery target using logistics manager
   */
  _findBestTarget(creep, rc) {
    // Get delivery orders from logistics
    const orders = rc.getDeliveryOrder(creep);
    
    if (!orders || (Array.isArray(orders) && orders.length === 0)) {
      return null;
    }

    // If single order, return it
    if (!Array.isArray(orders)) {
      return Game.getObjectById(orders.id);
    }

    // Multiple orders - pick best one (first = highest priority)
    const bestOrder = orders[0];
    return Game.getObjectById(bestOrder.id);
  }

  /**
   * Get fallback target in order: Terminal → Storage → Drop
   * Returns target object or null if all fallbacks fail
   */
  _getFallbackTarget(creep) {
    // 1. Try Terminal
    const terminal = this._tryTerminalFallback(creep);
    if (terminal) return terminal;

    // 2. Try Storage
    const storage = this._tryStorageFallback(creep);
    if (storage) return storage;

    // 3. Last resort: Drop resources
    this._dropAllResources(creep);
    return null; // No target to move to after dropping
  }

  /**
   * Try Terminal as fallback target
   */
  _tryTerminalFallback(creep) {
    const terminal = creep.room.terminal;
    if (!terminal || !terminal.my) return null;

    // Check if terminal can accept any of our resources
    for (const resourceType of Object.keys(creep.store)) {
      const amount = creep.store[resourceType];
      if (amount > 0 && terminal.store.getFreeCapacity(resourceType) > 0) {
        Log.info(`${creep} using terminal as fallback target`, "transfer_resources");
        return terminal;
      }
    }
    
    return null;
  }

  /**
   * Try Storage as fallback target
   */
  _tryStorageFallback(creep) {
    const storage = creep.room.storage;
    if (!storage || !storage.my) return null;

    // Check if storage can accept any of our resources
    for (const resourceType of Object.keys(creep.store)) {
      const amount = creep.store[resourceType];
      if (amount > 0 && storage.store.getFreeCapacity(resourceType) > 0) {
        Log.info(`${creep} using storage as fallback target`, "transfer_resources");
        return storage;
      }
    }
    
    return null;
  }

  /**
   * Drop all resources as last resort
   */
  _dropAllResources(creep) {
    Log.warn(`${creep} dropping all resources - no delivery target available (terminal and storage full/missing)`, "transfer_resources");
    for (const resourceType of Object.keys(creep.store)) {
      const amount = creep.store[resourceType];
      if (amount > 0) {
        creep.drop(resourceType);
      }
    }
  }

  /**
   * Transfer all resources to target (sorted by priority)
   */
  _transferAllResources(creep, target) {
    const targetObj = Game.getObjectById(target.id);
    if (!targetObj) {
      creep.target = null;
      return;
    }

    // Get all resources, sorted by priority (energy first, then others)
    const resources = this._getResourcesSorted(creep);
    
    let moved = false;
    
    for (const resourceType of resources) {
      const amount = creep.store[resourceType] || 0;
      if (amount === 0) continue;

      // Check capacity
      let transferAmount = amount;
      if (targetObj.store) {
        const freeCapacity = targetObj.store.getFreeCapacity(resourceType);
        if (freeCapacity <= 0) continue;
        transferAmount = Math.min(amount, freeCapacity);
      }

      // Transfer
      const result = creep.transfer(targetObj, resourceType, transferAmount);
      
      switch (result) {
        case OK:
          moved = true;
          break;
        case ERR_NOT_IN_RANGE:
          creep.travelTo(targetObj, { maxRooms: 0 });
          return; // Stop, need to move first
        case ERR_FULL:
          // Target full for this resource, try next
          continue;
        case ERR_INVALID_TARGET:
        case ERR_NOT_ENOUGH_RESOURCES:
          // Unexpected errors - clear target
          creep.target = null;
          return;
        default:
          Log.warn(`${creep} transfer error: ${global.getErrorString(result)}`, "transfer_resources");
          creep.target = null;
          return;
      }
    }

    // Clear target if all resources transferred
    if (creep.store.getUsedCapacity() === 0) {
      creep.target = null;
    }
  }

  /**
   * Get resource types sorted by priority (energy first, then alphabetical)
   */
  _getResourcesSorted(creep) {
    const resources = Object.keys(creep.store).filter(rt => (creep.store[rt] || 0) > 0);
    
    // Energy first, then alphabetical
    resources.sort((a, b) => {
      if (a === RESOURCE_ENERGY) return -1;
      if (b === RESOURCE_ENERGY) return 1;
      return a.localeCompare(b);
    });
    
    return resources;
  }
}

module.exports = new TransferResourcesBehavior();
