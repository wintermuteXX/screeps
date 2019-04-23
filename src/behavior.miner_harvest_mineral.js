var Behavior = require("_behavior");
var b = new Behavior("miner_harvest_mineral");

b.when = function (creep,rc) {
  var extractor = _.filter(rc.find(FIND_MY_STRUCTURES), function (s) {
    return (s.structureType === STRUCTURE_EXTRACTOR);
  });

  return extractor;
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
    // Old way - delete later
    // let container = rc.getMineralContainer();
    let container = creep.room.extractor.container;
    // console.log("Container Mineral: " + container + " new: " + extractor.container);
    if (container) {
    creep.moveTo(container);
    } else if (!creep.pos.isNearTo(target)) {
      creep.moveTo(target);
    }
    if (Game.time % (EXTRACTOR_COOLDOWN + 1) === 0) {
      creep.harvest(target);
      // TODO Errorhandling
    }
  }
};

module.exports = b;