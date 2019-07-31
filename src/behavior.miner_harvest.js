var Behavior = require("_behavior");

var b = new Behavior("miner_harvest");
b.when = function () {
  return true;
};

b.completed = function () {
  return false;
};

b.work = function (creep, rc) {
  var source = creep.getTarget();

  if (source === null) {
    source = _.find(rc.getSources(), function (s) {
      return (rc.getCreeps("miner", s.id).length === 0);
    });
  }

  if (source !== null && source !== undefined) {
    creep.target = source.id;

    if (source.container && !(creep.pos.isEqualTo(source.container.pos))) {
      creep.travelTo(source.container);
    } else if (!creep.pos.isNearTo(source)) {
      creep.travelTo(source);
    }

    creep.harvest(source);
    if (creep.energy == 0) {
      return
    }
    var link;
    if (source.memory.linkID) {
      link = Game.getObjectById(source.memory.linkID);
    } else {
      link = rc.findNearLink(creep);
      if (link) {source.memory.linkID = link.id}
    }
    if (link) {
      creep.transfer(link, RESOURCE_ENERGY);
    } else {
      creep.drop(RESOURCE_ENERGY);
    }
  } else {
    Log.warn(`creep${creep} does not find free source`, "miner_harvest");
  }
}

module.exports = b;