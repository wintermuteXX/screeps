const Behavior = require("_behavior");

const b = new Behavior("repair");
b.when = function (creep, rc) {
  if (creep.store.getUsedCapacity() > 0) {
    return (rc.findStructuresToRepair().length);
  }
  return false;
};

b.completed = function (creep, rc) {
  const target = creep.getTarget();
  return (creep.store.getUsedCapacity() === 0 || !target || target.hits === target.hitsMax);
};

b.work = function (creep, rc) {
  let target = creep.getTarget();

  if (!target) {
    const structures = rc.findStructuresToRepair();
    if (structures.length) {
      target = structures[0];
      creep.target = target.id;
    }
  }

  if (target) {
    if (creep.repair(target) == ERR_NOT_IN_RANGE) {
      creep.travelTo(target);
    }
  }
};

module.exports = b;