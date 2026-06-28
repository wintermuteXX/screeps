const Behavior = require("./behavior.base");
const Log = require("./lib.log");

const TRAVEL_OPTS = { maxRooms: 1 };

/**
 * Unified transport: collect from logistics gives, deliver to needs.
 * Active object id is creep.target (memory.target) for logistics dedup.
 * exact orders (need.exact) withdraw and deliver only need.amount to need.id.
 */
class TransportBehavior extends Behavior {
  constructor() {
    super("transport");
  }

  /**
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   * @returns {boolean}
   */
  when(creep, rc) {
    if (creep.store.getUsedCapacity() > 0) {
      return true;
    }
    if (creep.target) {
      return true;
    }
    if (creep.memory.role === "transporter") {
      return true;
    }
    return rc.givesResources().length > 0;
  }

  /**
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   * @returns {boolean}
   */
  completed(creep, rc) {
    return creep.store.getUsedCapacity() === 0 && !creep.target;
  }

  /**
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   */
  work(creep, rc) {
    if (creep.store.getUsedCapacity() === 0) {
      this._collectResources(creep, rc);
    } else {
      this._deliverResources(creep, rc);
    }
  }

  /**
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   */
  _collectResources(creep, rc) {
    if (!creep.target) {
      const match = rc.getTransportOrder(creep);
      if (!match) {
        return;
      }

      const {give, need} = match;
      const isExact = !!need.exact;

      creep.target = give.id;
      creep.memory.transportResource = give.resourceType;
      creep.memory.transportExact = isExact;
      creep.memory.transportNeedId = need.id;
      creep.memory.transportAmount = isExact ? need.amount : give.amount;
    }

    const target = creep.getTarget();
    if (!target) {
      this._clearTransportMemory(creep);
      return;
    }

    const resourceType = creep.memory.transportResource;
    let result;

    if (target.store !== undefined) {
      const amount = this._getWithdrawAmount(
        creep,
        target,
        resourceType,
        creep.memory.transportAmount,
        !!creep.memory.transportExact,
      );
      if (amount <= 0) {
        this._clearTransportMemory(creep);
        return;
      }
      result = creep.withdraw(target, resourceType, amount);
    } else {
      result = creep.pickup(target);
    }

    this._handleCollectResult(creep, target, result);
  }

  /**
   * @param {Creep} creep
   * @param {RoomObject} target
   * @param {number} result
   */
  _handleCollectResult(creep, target, result) {
    switch (result) {
      case OK:
      case ERR_FULL:
        this._rememberCollectSource(creep, target.id);
        break;

      case ERR_NOT_IN_RANGE:
        creep.travelTo(target, TRAVEL_OPTS);
        break;

      case ERR_INVALID_TARGET:
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} collect failed from ${target}: ${global.getErrorString(result)}`, "transport");
        this._clearTransportMemory(creep);
        break;

      default:
        Log.warn(`${creep} unknown collect result: ${global.getErrorString(result)}`, "transport");
        this._clearTransportMemory(creep);
    }
  }

  /**
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   */
  _deliverResources(creep, rc) {
    let orderAmount = creep.memory.transportAmount;

    if (!creep.target) {
      const order = this._findDeliveryOrder(creep, rc);
      if (order) {
        creep.target = order.id;
        orderAmount = order.amount;
      } else if (creep.memory.transportExact) {
        this._clearTransportMemory(creep);
        return;
      } else {
        const fallback = this._getFallbackTarget(creep);
        if (!fallback) {
          return;
        }
        creep.target = fallback.id;
        orderAmount = null;
      }
      creep.memory.transportAmount = orderAmount;
    }

    const target = creep.getTarget();
    if (!target) {
      this._clearDeliveryTarget(creep);
      return;
    }

    const limitAmount = creep.memory.transportExact ? creep.memory.transportAmount : orderAmount;
    this._transferResources(creep, target, limitAmount);
  }

  /**
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   * @returns {Object|null}
   */
  _findDeliveryOrder(creep, rc) {
    const orders = rc.getDeliveryOrder(creep);
    const list = !orders ? [] : (Array.isArray(orders) ? orders : [orders]);
    if (list.length === 0) {
      return null;
    }

    if (creep.memory.transportExact && creep.memory.transportNeedId) {
      const paired = list.find(o => o.id === creep.memory.transportNeedId);
      return paired || null;
    }

    const collectSourceId = creep.memory.transportCollectSourceId;
    const filtered = collectSourceId
      ? list.filter(o => o.id !== collectSourceId)
      : list;

    return filtered.length > 0 ? filtered[0] : null;
  }

  /**
   * Terminal → storage → drop.
   * @param {Creep} creep
   * @returns {Structure|null}
   */
  _getFallbackTarget(creep) {
    if (!creep.room) {
      return null;
    }

    const skipId = creep.memory.transportCollectSourceId;
    const terminal = creep.room.terminal;
    if (terminal && terminal.my && terminal.store.getFreeCapacity() > 0 && terminal.id !== skipId) {
      return terminal;
    }

    const storage = creep.room.storage;
    if (storage && storage.my && storage.store.getFreeCapacity() > 0 && storage.id !== skipId) {
      return storage;
    }

    this._dropAllResources(creep);
    return null;
  }

  /**
   * @param {Creep} creep
   */
  _dropAllResources(creep) {
    this._clearTransportMemory(creep);
    Log.warn(`${creep} dropping resources - no delivery target`, "transport");
    for (const resourceType of Object.keys(creep.store)) {
      if (creep.store[resourceType] > 0) {
        creep.drop(resourceType);
      }
    }
  }

  /**
   * @param {Creep} creep
   * @param {RoomObject} target
   * @param {number|null} orderAmount
   */
  _transferResources(creep, target, orderAmount) {
    const totalCarriedBefore = creep.store.getUsedCapacity();
    let totalTransferred = 0;

    for (const resourceType of this._getSortedCarriedResources(creep)) {
      const carried = creep.store[resourceType];
      if (carried <= 0) {
        continue;
      }

      let transferAmount = carried;
      if (target.store) {
        const free = target.store.getFreeCapacity(resourceType);
        if (free <= 0) {
          continue;
        }
        transferAmount = Math.min(transferAmount, free);
      }

      if (orderAmount != null) {
        const remaining = orderAmount - totalTransferred;
        if (remaining <= 0) {
          this._finishExactTransfer(creep, totalCarriedBefore, totalTransferred);
          return;
        }
        transferAmount = Math.min(transferAmount, remaining);
      }

      const result = creep.transfer(target, resourceType, transferAmount);

      switch (result) {
        case OK:
          totalTransferred += transferAmount;
          this._finishExactTransfer(creep, totalCarriedBefore, totalTransferred, orderAmount);
          return;

        case ERR_NOT_IN_RANGE:
          creep.travelTo(target, TRAVEL_OPTS);
          return;

        case ERR_FULL:
        case ERR_INVALID_TARGET:
        case ERR_NOT_ENOUGH_RESOURCES:
          this._clearDeliveryTarget(creep);
          return;

        default:
          Log.warn(`${creep} transfer error: ${global.getErrorString(result)}`, "transport");
          this._clearDeliveryTarget(creep);
          return;
      }
    }

    this._finishExactTransfer(creep, totalCarriedBefore, totalTransferred, orderAmount);
  }

  /**
   * @param {Creep} creep
   * @param {number} totalCarriedBefore
   * @param {number} totalTransferred
   * @param {number|null} [orderAmount]
   */
  _finishExactTransfer(creep, totalCarriedBefore, totalTransferred, orderAmount) {
    const expectedRemaining = totalCarriedBefore - totalTransferred;

    if (expectedRemaining <= 0) {
      this._clearTransportMemory(creep);
      return;
    }

    if (creep.memory.transportExact) {
      if (orderAmount != null && totalTransferred >= orderAmount) {
        this._clearTransportMemory(creep);
      } else {
        this._clearDeliveryTarget(creep);
      }
      return;
    }

    if (totalTransferred === 0 || (orderAmount != null && totalTransferred >= orderAmount)) {
      this._clearDeliveryTarget(creep);
    }
  }

  /**
   * @param {Creep} creep
   * @param {RoomObject} target
   * @param {ResourceConstant} resourceType
   * @param {number|null} orderAmount
   * @param {boolean} [isExact]
   * @returns {number}
   */
  _getWithdrawAmount(creep, target, resourceType, orderAmount, isExact = false) {
    const available = target.store[resourceType] || 0;
    const freeCapacity = creep.store.getFreeCapacity(resourceType) || 0;

    let requested;
    if (isExact && orderAmount != null) {
      requested = orderAmount;
    } else if (this._isGreedyContainer(target)) {
      requested = available;
    } else {
      requested = orderAmount || available;
    }

    return Math.min(available, freeCapacity, requested);
  }

  /**
   * @param {Creep} creep
   * @returns {ResourceConstant[]}
   */
  _getSortedCarriedResources(creep) {
    return Object.keys(creep.store)
      .filter(r => creep.store[r] > 0)
      .sort((a, b) => (a === RESOURCE_ENERGY ? -1 : b === RESOURCE_ENERGY ? 1 : 0));
  }

  /**
   * @param {RoomObject} target
   * @returns {boolean}
   */
  _isGreedyContainer(target) {
    if (!target.structureType || target.structureType !== STRUCTURE_CONTAINER) {
      return false;
    }

    const { room } = target;
    if (!room) {
      return false;
    }

    const sources = room.sources || room.find(FIND_SOURCES);
    for (const source of sources) {
      if (target.pos.inRangeTo(source, 2)) {
        return true;
      }
    }

    const mineral = room.mineral;
    return !!(mineral && target.pos.inRangeTo(mineral, 2));
  }

  /**
   * @param {Creep} creep
   * @param {string} sourceId
   */
  _rememberCollectSource(creep, sourceId) {
    creep.target = null;
    creep.memory.transportCollectSourceId = sourceId;
  }

  /**
   * @param {Creep} creep
   */
  _clearDeliveryTarget(creep) {
    creep.target = null;
    if (!creep.memory.transportExact) {
      creep.memory.transportAmount = null;
    }
  }

  /**
   * @param {Creep} creep
   */
  _clearTransportMemory(creep) {
    creep.target = null;
    creep.memory.transportResource = null;
    creep.memory.transportAmount = null;
    creep.memory.transportExact = null;
    creep.memory.transportNeedId = null;
    creep.memory.transportCollectSourceId = null;
  }
}

module.exports = new TransportBehavior();
