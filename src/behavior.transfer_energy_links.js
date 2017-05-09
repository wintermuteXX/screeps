var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_links");

function findLinks(rc) {
  return _.filter(rc.links.senders, function(s) {
    return s.energy < s.energyCapacity;
  });
}

b.when = function(creep, rc) {
  creep.say('En. > Lin.');
  if (creep.energy === 0) return false;
  var links = findLinks(rc);
  var inRange = creep.pos.findInRange(links, 2);
  return (inRange.length);
};

b.completed = function(creep, rc) {
  var link = creep.getTarget();

  if (creep.energy === 0) return true;
  if (link && link.energy === link.energyCapacity) return true;

  return false;
};

b.work = function(creep, rc) {
  var link = creep.getTarget();


//  if (link === null) {
//    var miner = Game.getObjectById(creep.memory.miner);
//    if (miner) {
//      var links = miner.pos.findInRange(findLinks(rc), 5);
//      if (links.length) {
//        link = creep.pos.findClosestByRange(links);
//        creep.target = link.id;
//      }
//    }
//  }

  if (link === null) {
      var links = creep.pos.findInRange(findLinks(rc), 5);
      if (links.length) {
        creep.target = links[0].id;
    }
  }

  if (link) {
    if (!creep.pos.isNearTo(link)) {
      creep.moveToEx(link);
    } else {
      creep.transfer(link,RESOURCE_ENERGY);
    }
  }

};

module.exports = b;
