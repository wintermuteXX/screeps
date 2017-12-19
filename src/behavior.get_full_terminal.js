var Behavior = require("_behavior");
var b = new Behavior("get_full_terminal");

b.when = function (creep, rc) {
  return (_.sum(creep.carry) === 0 && rc.room.terminal);
};

b.completed = function (creep, rc) {
  return (_.sum(creep.carry) > 0);
};

b.work = function (creep, rc) {
    var target = creep.getTarget();
    
    if (target === null && rc.room.terminal) {
      creep.target = rc.room.terminal.id;
    }
    target = creep.getTarget();
    //console.log(creep.room.name, target);
    if (target !== null) {
      if (!creep.pos.isNearTo(target)) {
        creep.travelTo(target);
      } else {
        _.each(target.store, function (amount, resourceType) {
              if (creep.room.store && (creep.room.store.store[resourceType] < 20000 || creep.room.store.store[resourceType] === undefined)) {
                var test = creep.withdraw(target, resourceType, 20000 - creep.room.store.store[resourceType]);
                creep.target = null;
              };
            });
          };
        };
      };
      module.exports = b;