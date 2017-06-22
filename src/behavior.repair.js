var Behavior = require("_behavior");

function findStructures(rc) {
  var structures = _.filter(rc.find(FIND_STRUCTURES), function (s) {
    return s.needsRepair();
  });

  return _.sortBy(structures, function (s) {
    return s.hits;
  });
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
    if (!creep.pos.isNearTo(target)) {
      creep.moveToEx(target);
    } else {
      creep.repair(target);
    }
  }
};

module.exports = b;
