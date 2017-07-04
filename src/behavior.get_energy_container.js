var Behavior = require("_behavior");

var b = new Behavior("get_energy_container");

b.when = function (creep, rc) {
 return (creep.energy === 0 && _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER && f.store[RESOURCE_ENERGY] > 300; }));
};

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy > 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();
  if (target === null) {
    var target = _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER && f.store[RESOURCE_ENERGY] > 300; });
    target = creep.pos.findClosestByRange(target);
    if (target) {
    creep.target = target.id;
    }
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      creep.withdraw(target, RESOURCE_ENERGY);
      creep.target = null;
    }
  }
};

module.exports = b;
