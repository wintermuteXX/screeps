var Behavior = require("_behavior");

var b = new Behavior("get_energy_container");

b.when = function (creep, rc) {
  // var containers = _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER});
  // containers = _.filter(containers, function (f) { return !f.store['energy']; });
  var containers = rc.getMineralContainer();
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
    var target = rc.getMineralContainer();
    // target = _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER});
    // target = _.filter(target, function (f) { return !f.store['energy']; });
    console.log("Das ist mein Ziel: " + target);
    if (target) {
    creep.target = target.id;
    }
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.moveTo(target);
    } else {
      creep.withdrawAllResources(target);
      creep.target = null;
    }
  }
};

module.exports = b;
