const Behavior = require("./behavior.base");
const Log = require("./lib.log");

const TRAVEL_OPTS = { maxRooms: 1 };

/**
 * Unified transport: collect one resource from a give, deliver that resource to a need.
 * Amounts come from give.amount / need.amount.
 * Exception: greedy gives (source/extractor energy, dropped energy) — take maximum.
 * Active object id is creep.target (memory.target) for logistics dedup.
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
      creep.target = give.id;
      creep.memory.transportResource = give.resourceType;
      creep.memory.transportNeedId = need.id;
      creep.memory.transportAmount = give.greedy ? null : give.amount;
    }

    const target = creep.getTarget();
    if (!target) {
      this._clearTransportMemory(creep);
      return;
    }

    const resourceType = creep.memory.transportResource;
    let result;

    if (target.store !== undefined) {
      const amount = this._getWithdrawAmount(creep, target, resourceType, creep.memory.transportAmount);
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
    if (!creep.target) {
      const order = rc.getDeliveryOrder(creep, {
        resourceType: creep.memory.transportResource || null,
        excludeId: creep.memory.transportCollectSourceId || null,
        preferId: creep.memory.transportNeedId || null,
      });
      if (!order) {
        this._dropAllResources(creep);
        return;
      }
      creep.target = order.id;
      creep.memory.transportAmount = order.amount;
    }

    const target = creep.getTarget();
    if (!target) {
      this._clearDeliveryTarget(creep);
      return;
    }

    this._transferResource(creep, target, creep.memory.transportAmount);
  }

  /**
   * @param {Creep} creep
   */
  _dropAllResources(creep) {
    const dropping = Object.keys(creep.store)
      .filter((resourceType) => creep.store[resourceType] > 0)
      .map((resourceType) => `${resourceType}×${creep.store[resourceType]}`)
      .join(", ");
    this._clearTransportMemory(creep);
    Log.warn(
      `${creep} dropping ${dropping || "nothing"} - no delivery target`,
      "transport"
    );
    for (const resourceType of Object.keys(creep.store)) {
      if (creep.store[resourceType] > 0) {
        creep.drop(resourceType);
      }
    }
  }

  /**
   * Transfer only the collected resource type to the delivery target.
   * @param {Creep} creep
   * @param {RoomObject} target
   * @param {number|null} orderAmount
   */
  _transferResource(creep, target, orderAmount) {
    const resourceType = creep.memory.transportResource;
    if (!resourceType) {
      this._dropAllResources(creep);
      return;
    }

    const carried = creep.store[resourceType] || 0;
    if (carried <= 0) {
      this._clearTransportMemory(creep);
      return;
    }

    let transferAmount = carried;
    if (target.store) {
      const free = target.store.getFreeCapacity(resourceType) || 0;
      if (free <= 0) {
        this._clearDeliveryTarget(creep);
        return;
      }
      transferAmount = Math.min(transferAmount, free);
    }

    if (orderAmount != null) {
      transferAmount = Math.min(transferAmount, orderAmount);
    }

    if (transferAmount <= 0) {
      this._clearDeliveryTarget(creep);
      return;
    }

    const result = creep.transfer(target, resourceType, transferAmount);

    switch (result) {
      case OK:
        // Intent applies end-of-tick; if we sent everything carried, trip is done.
        if (transferAmount >= carried) {
          this._clearTransportMemory(creep);
        } else {
          this._clearDeliveryTarget(creep);
        }
        break;

      case ERR_NOT_IN_RANGE:
        creep.travelTo(target, TRAVEL_OPTS);
        break;

      case ERR_FULL:
      case ERR_INVALID_TARGET:
      case ERR_NOT_ENOUGH_RESOURCES:
        this._clearDeliveryTarget(creep);
        break;

      default:
        Log.warn(`${creep} transfer error: ${global.getErrorString(result)}`, "transport");
        this._clearDeliveryTarget(creep);
    }
  }

  /**
   * @param {Creep} creep
   * @param {RoomObject} target
   * @param {ResourceConstant} resourceType
   * @param {number|null} orderAmount
   * @returns {number}
   */
  _getWithdrawAmount(creep, target, resourceType, orderAmount) {
    const available = target.store[resourceType] || 0;
    const freeCapacity = creep.store.getFreeCapacity(resourceType) || 0;
    const requested = orderAmount != null ? orderAmount : available;
    return Math.min(available, freeCapacity, requested);
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
    creep.memory.transportAmount = null;
  }

  /**
   * @param {Creep} creep
   */
  _clearTransportMemory(creep) {
    creep.target = null;
    creep.memory.transportResource = null;
    creep.memory.transportAmount = null;
    creep.memory.transportNeedId = null;
    creep.memory.transportCollectSourceId = null;
  }
}

module.exports = new TransportBehavior();
