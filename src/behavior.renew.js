var Behavior = require("_behavior");

var b = new Behavior("renew");

b.when = function (creep, rc) {
  return (creep.ticksToLive < 50) && (creep.memory.renew == true) && (creep.memory.bornEnergyLevel == creep.room.energyCapacityAvailable);
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
    var targettest = rc.getIdleSpawn(); // Does not work
    //TODO: Find Idle Spawn 
    target = creep.room.spawns[0];
    console.log("Renew target: " + target + " Target2: " + targettest);
    if (target && !target.Spawning) {
      creep.target = target.id;
    }
  }

  if (target && !target.Spawning) {
    var result = target.renewCreep(creep);
    switch (result) {
      case OK:
      case ERR_NOT_ENOUGH_RESOURCES:
        console.log("No resources in Spawn");
        creep.memory.abort = true;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;

      default:
        console.log(`unknown result from (creep ${creep}). renew (${target}): ${result}`);
    }
  }
};

module.exports = b;