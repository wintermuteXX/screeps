var Behavior = require("_behavior");
var b = new Behavior("get_resources");

b.when = function (creep, rc) {
  if (!creep.room.memory.QueueAvailableResources) return false;
  if (creep.energy > 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  return (creep.energy > 0 || creep.target === null);
};

b.work = function (creep, rc) {
  Log.debug(`${creep} is running GET RESOURCES in Tick ${Game.time}`, "Creep");
  var target = creep.getTarget();

  if (!target) {
    var resources = creep.room.memory.QueueAvailableResources;
    for (var resource in resources) {
      // check if ther creep has same target -> abort
      if (resources[resource].amount > 0 && rc.getCreeps(null, resources[resource].id).length == 0) {
        creep.target = resources[resource].id;
        target = creep.getTarget();
        creep.memory.resourceType = resources[resource].resourceType;
        creep.memory.structure = resources[resource].structure;
        break;
      }
    }
  }

  if (target) {
    let result;
     // test if target is structure
    if (target.my === false) {
      result = creep.pickup(target, creep.memory.resourceType);
    } else {
      result = creep.withdraw(target, creep.memory.resourceType);
    }
    switch (result) {
      case OK:
      case ERR_NOT_ENOUGH_RESOURCES:
        creep.target = null;
        creep.memory.structure = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;

      default:
        Log.warn(`unknown result from (creep ${creep}).pickup(${target}): ${result}`, "Creep");
    }
  }
};
module.exports = b;