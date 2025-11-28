var Behavior = require("_behavior");
const CONSTANTS = require("constants");

var b = new Behavior("renew_emergency");
b.when = function (creep, rc) {
  return (creep.ticksToLive < CONSTANTS.CREEP_LIFECYCLE.RENEW_EMERGENCY) && (creep.memory.bornEnergyLevel == creep.room.energyCapacityAvailable) && rc.getIdleSpawnObject();
};

b.completed = function (creep, rc) {
  if (creep.memory.abort) {
    creep.memory.abort = false;
    return true
  }
  return creep.ticksToLive > CONSTANTS.CREEP_LIFECYCLE.RENEW_NORMAL;
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
    var target = rc.getIdleSpawnObject();
  }

  if (target) {
    creep.target = target.id;
    var result = target.renewCreep(creep);
    switch (result) {
      case OK:
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} has not enough resources for renew (${target}): ${result}`, "Creep");
        creep.memory.abort = true;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;
      case ERR_BUSY:
        creep.memory.abort = true;
        break;
      default:
        Log.warn(`${creep} get unknown result from renew (${target}): ${result}`, "Creep");
        creep.memory.abort = true;
    }
  }
};

module.exports = b;