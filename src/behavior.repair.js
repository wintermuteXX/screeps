const Behavior = require("./behavior.base");

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
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(target);
      }
    }
  }
}

module.exports = new RepairBehavior();
