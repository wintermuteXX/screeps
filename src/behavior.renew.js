var Behavior = require("_behavior");

var b = new Behavior("renew");

b.when = function (creep, rc) {
  return (creep.ticksToLive < 50) && (creep.memory.renew == true) && (creep.memory.bornEnergyLevel == creep.room.energyCapacityAvailable) && !creep.room.spawns[0].spawning;
};

b.completed = function (creep, rc) {
  if (creep.memory.abort) {
    creep.memory.abort = false;
    return true
  }
  return creep.ticksToLive > 1450;
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
    // TEST Find Idle Spawn 
    var target2 = rc.getIdleSpawn();
    var target = creep.room.spawns[0];
    console.log("T1 + T2: " + target + " " + target2)
  }

  if (target) {
    creep.target = target.id;
    var result = target.renewCreep(creep);
    switch (result) {
      case OK:
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`not enough resources for (creep ${creep}). renew (${target}): ${result}`, "Creep");
        creep.memory.abort = true;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;
      case ERR_BUSY:
        creep.memory.abort = true;
        break;
      default:
        Log.warn(`unknown result from (creep ${creep}). renew (${target}): ${result}`, "Creep");
    }
  }
};

module.exports = b;