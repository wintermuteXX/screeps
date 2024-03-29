var Behavior = require("_behavior");

var b = new Behavior("renew");
b.when = function (creep, rc) {
  return creep.memory.bornEnergyLevel == creep.room.energyCapacityAvailable && rc.getIdleSpawnObject() && creep.ticksToLive < 1300;
};

b.completed = function (creep, rc) {
  if (creep.memory.abort) {
    creep.memory.abort = false;
    return true;
  }
  return false;
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
    var target = rc.getIdleSpawnObject();
  }

  if (target && target.store[RESOURCE_ENERGY] > 0) {
    creep.target = target.id;
    var result = target.renewCreep(creep);
    switch (result) {
      case OK:
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} not enough resources for renew (${target}): ${result}`, "Creep");
        creep.memory.abort = true;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;
      case ERR_BUSY:
      case ERR_FULL:
        creep.memory.abort = true;
        break;
      default:
        creep.memory.abort = true;
        Log.warn(`${creep} has unknown result from renew (${target}): ${result}`, "Creep");
    }
  } else {
    creep.memory.abort = true;
  }
};

module.exports = b;
