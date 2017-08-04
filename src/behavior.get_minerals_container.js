var Behavior = require("_behavior");

var b = new Behavior("get_energy_container");

b.when = function (creep, rc) {
  var containers = _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER});
  containers = _.filter(containers, function (f) { return !f.store['energy']; });
  return (creep.energy === 0 && containers);
}

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || _.sum(creep.carry) > 0);
};

b.work = function (creep, rc) {
  console.log("Getting minerals");
  var target = creep.getTarget();
  if (target === null) {
    target = _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER});
    target = _.filter(target, function (f) { return !f.store['energy']; });
    console.log("Das ist mein Ziel: " + target);
    if (target) {
    creep.target = target.id;
    }
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
    } else {
      var mineral = target.store[0];
      creep.withdraw(target, mineral);
      creep.target = null;
    }
  }
};

module.exports = b;
