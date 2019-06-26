var Behavior = require("_behavior");

function findStructures(rc) {
  // TODO First repair Ramparts! Not walls...
  var structures = _.filter(rc.find(FIND_STRUCTURES), function (s) {
    return s.needsRepair();
  });

  let theStructure = _.sortBy(structures, function (s) {
    return s.hits;
  });

  console.log("Repair Test: " + theStructure + " " + theStructureTest)
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