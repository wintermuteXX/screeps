var Behavior = require("_behavior");

// TODO Move to RC and find better name
function findStructures(rc) {
  // TODO First repair Ramparts! Not walls...
  // TODO Do not repair walls/ramparts if RCL < 3?
  var structures = _.filter(rc.find(FIND_STRUCTURES), function (s) {
    return s.needsRepair();
  });

  let theStructure = _.sortBy(structures, function (s) {
    return s.hits;
  });

  return theStructure
}

var b = new Behavior("repair");
b.when = function (creep, rc) {
  if (creep.energy > 0) {
    return (findStructures(rc).length);
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
    var structures = findStructures(rc);
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