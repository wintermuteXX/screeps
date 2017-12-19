var Behavior = require("_behavior");
var b = new Behavior("get_full_storage");

b.when = function (creep, rc) {
  return (_.sum(creep.carry) === 0 && rc.room.storage);
};

b.completed = function (creep, rc) {
  return (_.sum(creep.carry) > 0) creep.target == null;
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (target === null && rc.room.storage) {
    creep.target = rc.room.storage.id;
  }
  target = creep.getTarget();
  //console.log(creep.room.name, target);
  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      _.each(target.store, function (amount, resourceType) {
        if (amount > 20000 && creep.room.terminal && (creep.room.terminal.store[resourceType] < 100000 || creep.room.terminal.store[resourceType] === undefined)) {
          var test = creep.withdraw(target, resourceType);
        };
      });
    };
    creep.target = null;
  };
};
module.exports = b;