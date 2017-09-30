var Behavior = require("_behavior");
var b = new Behavior("get_energy_spawn");

b.when = function (creep, rc) {
  return (creep.energy === 0);
};

b.completed = function (creep, rc) {
  return (creep.energy > 0);
};

b.work = function (creep, rc) {
    var target = creep.getTarget();

    if (target === null) {
      creep.target = rc.room.storage.id;
    }

    if (target !== null) {
      if (!creep.pos.isNearTo(target)) {
        creep.travelTo(target);
      } else {
        _.each(target.store, function (amount, resourceType) {
              if (amount > 20000) {

                console.log("Get full storage: " + target.amount, target.resourceType, target.room.name);
                var test = creep.withdraw(target, target.resourceType);
                console.log("Result: " + test);
                creep.target = null;
              };
            });
          };
        };
      };
      module.exports = b;