var Behavior = require("_behavior");

var b = new Behavior("get_energy_storage");

b.when = function (creep, rc) {
  //   return (creep.energy === 0 && rc.room.storage.store.energy > 0);
  // console.log(rc.room.storage.store.energy);
  return (creep.energy === 0 && rc.room.storage);
};

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy > 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (target === null) {
    creep.target = rc.room.storage.id;
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.moveToEx(target);
    } else {
      // target.transferEnergy(creep);
      creep.withdraw(target, RESOURCE_ENERGY);
      // creep.moveTo(storage);
      creep.target = null;
    }
  }
};

module.exports = b;
