var Behavior = require("_behavior");

var b = new Behavior("get_energy_storage");

b.when = function(creep, rc) {
  console.log(rc.room.storage.store);
  return (creep.energy === 0 && rc.room.storage.store > 0);
};

b.completed = function(creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy > 0);
};

b.work = function(creep, rc) {
  var target = creep.getTarget();

  if ( target === null ) {
     creep.target = rc.room.storage.id;
  }

  if ( target !== null ) {
    if ( !creep.pos.isNearTo(target) ) {
      creep.moveToEx(target);
    } else {
      target.transferEnergy(creep);
      creep.target = null;
    }
  }
};

module.exports = b;
