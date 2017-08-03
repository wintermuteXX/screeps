var Behavior = require("_behavior");

function findNearLink(obj, rc) {
  var links = rc.links.senders;
  var thelink = obj.pos.findInRange(links, 1);
  if (thelink) return thelink;

}

var b = new Behavior("miner_harvest_mineral");


b.when = function () {
  return true;
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
    let container = creep.room.mineralContainer;
    if (container) {
      test = creep.moveTo(container[0]);
    } else if (!creep.pos.isNearTo(target)) {
      creep.moveTo(target);
    }
    if (Game.time % (EXTRACTOR_COOLDOWN + 1) === 0) {
      let test = creep.harvest(target);
    }
  }
};

module.exports = b;