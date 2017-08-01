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
    if (!creep.pos.isNearTo(target)) {
      creep.moveTo(target);
    } else {
   if (Game.time % (EXTRACTOR_COOLDOWN + 1) === 0) {
      let test = creep.harvest(target);
   }
      // TODO: Storage + Link in creep memory speichern und benutzen.
      // var link = findNearLink(creep, rc);
      // if (creep.pos.isNearTo(rc.room.storage)) {creep.transfer(rc.room.storage, source.mineralType); }
      // else if (link) { console.log("link"); creep.transfer(link[0], source.mineralType); }
      // else { console.log("drop");
      // for(const resourceType in creep.carry) { creep.drop(resourceType); } 
    // }
    }
  }
};

module.exports = b;
