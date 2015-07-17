var Behavior = require("behavior.base");

var b = new Behavior("miner_harvest");

b.when = function() {
  return true;
};

b.completed = function() {
  return false;
};

b.work = function(creep, rc) {
  var source = null;
  
  if (!creep.target) {
    source = _.find(rc.getSources(), function (s) {
      return (rc.getCreeps("miner", s.id).length === 0);
    });
  }

  if (source === null) {
    source = Game.getObjectById(creep.target);
  }

  if (source !== null) {
    if (!creep.pos.isNearTo(source)) {
      console.log(creep, creep.moveTo(source));
    } else {
      creep.harvest(source);
    }
  }
};

module.exports = b;
