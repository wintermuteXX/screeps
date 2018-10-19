var Behavior = require("_behavior");

var b = new Behavior("renew");

b.when = function (creep, rc) {
  return (creep.ticksToLive < 30) && (creep.memory.renew == true) && (creep.memory.born.energyLevel == creep.room.energyCapacityAvailable);
};

b.completed = function (creep, rc) {
  return creep.ticksToLive > 1450;
};

b.work = function (creep, rc) {
    var target = creep.getTarget();

    if (!target) { 
        target = rc.getIdleSpawn();
        if (target) {creep.target = target.id;}
    }

    if (target) {
        var result = target.renew(creep);
        witch (result) {
            case OK:
            case ERR_NOT_ENOUGH_RESOURCES:
              console.log("Waiting for resources to renew");
              break;
            case ERR_NOT_IN_RANGE:
              creep.travelTo(target);
              break;
      
            default:
              console.log(`unknown result from (creep ${creep}).pickup(${target}): ${result}`);
          }
    }
};

module.exports = b;
