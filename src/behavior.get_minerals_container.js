var Behavior = require("_behavior");

var b = new Behavior("get_energy_container");

b.when = function (creep, rc) {
  var containers = _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER});
  containers = _.filter(containers, function (f) { return !f.store['energy']; });
  return (creep.energy === 0 && containers);

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy > 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();
  if (target === null) {
    var target = _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER});
    target = _.filter(containers, function (f) { return !f.store['energy']; });
    if (target) {
    creep.target = target.id;
    }
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      var mineral = target.store[0];
      creep.withdraw(target, mineral);
      creep.target = null;
    }
  }
};

module.exports = b;
