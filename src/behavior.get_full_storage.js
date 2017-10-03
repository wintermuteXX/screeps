var Behavior = require("_behavior");
var b = new Behavior("get_full_storage");

b.when = function (creep, rc) {
  return (_.sum(creep.carry) === 0);
};

b.completed = function (creep, rc) {
  return (_.sum(creep.carry) > 0);
};

b.work = function (creep, rc) {
    var target = creep.getTarget();
    
    if (target === null) {
      creep.target = rc.room.storage.id;
    }
    target = creep.getTarget();
    //console.log(target);
    if (target !== null) {
      if (!creep.pos.isNearTo(target)) {
        creep.travelTo(target);
      } else {
        _.each(target.store, function (amount, resourceType) {
              if (amount > 20000) {

                // console.log("Get full storage: " + amount, resourceType, target.room.name);
                var test = creep.withdraw(target, resourceType);
                creep.target = null;
              };
            });
          };
        };
      };
      module.exports = b;