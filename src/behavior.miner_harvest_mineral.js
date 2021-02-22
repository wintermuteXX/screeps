var Behavior = require("_behavior");
var b = new Behavior("miner_harvest_mineral");

b.when = function (creep, rc) {
  return creep.room.extractor && creep.room.mineral.mineralAmount > 0;
};

b.completed = function (creep) {
  return creep.room.mineral.mineralAmount === 0;
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (target === null) {
    creep.target = creep.room.mineral.id;
    target = Game.getObjectById(creep.target);
  }

  if (target !== null) {
    if (creep.room.extractor && creep.room.extractor.container) {
      let container = creep.room.extractor.container;
      creep.travelTo(container);
    } else if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    }
    if (Game.time % (EXTRACTOR_COOLDOWN + 1) === 0) {
      let result = creep.harvest(target);

      switch (result) {
        case OK:
        case ERR_NOT_IN_RANGE:
          break;
        default:
          Log.warn(`unknown result from (creep ${creep}).harvest mineral(${target}): ${result}`, "Creep");
      }
    }
  }
};

module.exports = b;