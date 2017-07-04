var Behavior = require("_behavior");

var b = new Behavior("build_structures");

b.when = function (creep, rc) {
  return (creep.energy > 0 && rc.find(FIND_CONSTRUCTION_SITES).length);
};

b.completed = function (creep, rc) {
  var target = creep.getTarget();
  return (creep.energy === 0 || target === null);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();
  if (target === null) {
    var constructions = rc.find(FIND_CONSTRUCTION_SITES);
    if (constructions.length) {
      target = constructions[0];
    }
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      creep.build(target);
    }
    creep.target = target.id;
  } else {
    creep.target = null;
  }
};

module.exports = b;
