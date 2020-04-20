var Behavior = require("_behavior");

var b = new Behavior("repair");
b.when = function (creep, rc) {
  if (creep.energy > 0) {
    return (rc.findStructuresToRepair().length);
  }
  return false;
};

b.completed = function (creep, rc) {
  var target = creep.getTarget();
  return (creep.energy === 0 || !target || target.hits === target.hitsMax);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
    var structures = rc.findStructuresToRepair();
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