var Behavior = require("_behavior");
var b = new Behavior("miner_harvest_mineral");

// FIXME Only work when minerals are available (when + completed needs addition)
b.when = function (creep, rc) {
  return creep.room.extractor;
};

b.completed = function () {
  return false;
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (target === null) {
    creep.target = creep.room.mineral.id;
    target = Game.getObjectById(creep.target);
  }

  if (target !== null) {
    let container = creep.room.extractor.container;
    if (container) {
      creep.moveTo(container);
    } else if (!creep.pos.isNearTo(target)) {
      creep.moveTo(target);
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