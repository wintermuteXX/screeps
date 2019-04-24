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
      creep.target = target.id;
    }
  }

  if (target !== null) {

    /* if (creep.build(target) == ERR_NOT_IN_RANGE) {
      creep.travelTo(target);
    } */

    var result = creep.build(target);
    switch (result) {
      case OK:
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;
      default:
        Log.warn(`unknown result from (creep ${creep}). build (${target}): ${result}`, "Creep");
        creep.target = null
    }
  }
};

module.exports = b;