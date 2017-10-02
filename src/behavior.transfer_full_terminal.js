var Behavior = require("_behavior");

var b = new Behavior("transfer_full_terminal");

b.when = function (creep, rc) {
  if (_.sum(creep.carry) === 0) return false;
 return (true);
};

b.completed = function (creep, rc) {
  var storage = creep.getTarget();

  if (_.sum(creep.carry) === 0) return true;
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
