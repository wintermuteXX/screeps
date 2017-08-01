var Behavior = require("_behavior");

var b = new Behavior("miner_harvest_mineral");

function findNearLink(obj, rc) {
  var links = rc.links.senders;
  var thelink = obj.pos.findInRange(links, 1);
  if (thelink) return thelink;

}

b.when = function () {
  return true;
};

b.completed = function () {
  return false;
};

b.work = function (creep, rc) {
  var source = creep.getTarget();

  if (!creep.target) {
    source = creep.room.mineral;
  }

  if (source === null) {
    source = Game.getObjectById(creep.target);
  }

  if (source !== null) {
    creep.target = source.id;
    if (!creep.pos.isNearTo(source)) {
      creep.moveTo(source);
    } else {
      creep.harvest(source);
      // TODO: Storage + Link in creep memory speichern und benutzen.
      var link = findNearLink(creep, rc);
      if (creep.pos.isNearTo(rc.room.storage)) { creep.transfer(rc.room.storage, source.mineralType); }
      else if (link) { creep.transfer(link[0], source.mineralType); }
      else { creep.drop(source.mineralType); }
    }
  }
};

module.exports = b;
