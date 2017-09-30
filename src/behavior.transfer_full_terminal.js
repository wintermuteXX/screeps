var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_storage");

b.when = function (creep, rc) {
  if (creep.energy === 0) return false;
 return (true);
};

b.completed = function (creep, rc) {
  var storage = creep.getTarget();

  if (creep.energy === 0) return true;
  return false;
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (target === null) {
    target = rc.room.terminal;
    if (target) {
      creep.target = target.id;
    }
  }

  if (target) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      creep.transferAllResources(target);
      target = null;
    }
  }

};

module.exports = b;
