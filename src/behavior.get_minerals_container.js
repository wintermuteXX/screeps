var Behavior = require("_behavior");

var b = new Behavior("get_energy_container");

b.when = function (creep, rc) {
  var containers = rc.find(FIND_STRUCTURES);
  console.log("Containers: " + containers);
  containers = _.filter(containers, function (f) { return !f.store.resourceType == 'energy' && !f.store.resourceType == 'power' && _.sum(f.store) > 100; });
  console.log("Containers full: " + containers);
 return (creep.energy === 0 && containers);
};

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy > 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();
  if (target === null) {
    var target = _.filter(rc.find(FIND_STRUCTURES), function (f) { return f.structureType === STRUCTURE_CONTAINER && !f.store.resourceType == 'energy' && !f.store.resourceType == 'power' && _.sum(f.store) > 100; });
    target = creep.pos.findClosestByRange(target);
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
