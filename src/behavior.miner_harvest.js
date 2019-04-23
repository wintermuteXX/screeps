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

  if (source !== null) {
    creep.target = source.id;

    if (source.container && !(creep.pos.isEqualTo(source.container.pos))) {
      creep.moveTo(source.container);
    } else if (!creep.pos.isNearTo(source)) {
      creep.moveTo(source);
    }

    creep.harvest(source);
    if (creep.energy == 0) {
      return
    }
    var link;
    if (creep.memory.link) {
      link = Game.getObjectById(creep.memory.link);
    } else {
      link = rc.findNearLink(creep);
    }
    if (link) {
      creep.transfer(link, RESOURCE_ENERGY);
    } else {
      creep.drop(RESOURCE_ENERGY);
    }
  } else {
    console.log("Keine Source gefunden");
  }
}

module.exports = b;