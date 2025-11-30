var Behavior = require("_behavior");
const Log = require("Log");

var b = new Behavior("build_structures");

b.when = function (creep, rc) {
  return (creep.store.getUsedCapacity() > 0 && rc.find(FIND_CONSTRUCTION_SITES).length);
};

b.completed = function (creep, rc) {
  var target = creep.getTarget();
  return (creep.store.getUsedCapacity() === 0 || target === null);
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
    var result = creep.build(target);
    switch (result) {
      case OK:
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;
      case ERR_NO_BODYPART:
        Log.error(`${creep} has no Bodypart, should kill myself.  build (${target}): ${result}`, "Creep");
        creep.suicide();
        break;
      default:
        Log.warn(`${creep} has unknown result from build ${target}: ${result}`, "Creep");
        creep.target = null
    }
  }
};

module.exports = b;