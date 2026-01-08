const Behavior = require("./behavior.base");
const Log = require("./lib.log");

class RepairBehavior extends Behavior {
  constructor() {
    super("repair");
  }

  when(creep, rc) {
    if (creep.store.getUsedCapacity() === 0) {
      return false;
    }
    return rc.findStructuresToRepair().length > 0;
  }

  completed(creep, rc) {
    const target = creep.getTarget();
    if (creep.store.getUsedCapacity() === 0) {
      return true;
    }
    if (!target) {
      return true;
    }
    return target.hits === target.hitsMax;
  }

  work(creep, rc) {
    let target = creep.getTarget();

    if (!target) {
      const structures = rc.findStructuresToRepair();
      if (structures.length) {
        target = structures[0];
        creep.target = target.id;
      }
    }

    if (target) {
      const result = creep.repair(target);
      switch (result) {
        case OK:
          break;
        case ERR_NOT_IN_RANGE:
          creep.travelTo(target);
          break;
        case ERR_INVALID_TARGET:
        case ERR_NOT_ENOUGH_RESOURCES:
          Log.warn(`${creep} repair error for ${target}: ${global.getErrorString(result)}. Clearing target.`, "repair");
          creep.target = null;
          break;
        default:
          Log.warn(`${creep} unknown repair result for ${target}: ${global.getErrorString(result)}`, "repair");
      }
    }
  }
}

module.exports = new RepairBehavior();
