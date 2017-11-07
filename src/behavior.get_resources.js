var Behavior = require("_behavior");
var b = new Behavior("get_resources");

b.when = function (creep, rc) {
  if (!creep.room.memory.QueueAvailableResources) return false;
  if (creep.energy > 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  // works with minerals?
  return (creep.energy > 0 || creep.target === null);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
    var resources = creep.room.memory.QueueAvailableResources;
    for (var resource in resources) {
      if (resources[resource].amount > 0) {
        // console.log(creep.room.memory.QueueAvailableResources[resource].amount);
        // console.log(creep.carryCapacity);
        creep.room.memory.QueueAvailableResources[resource].amount -= creep.carryCapacity;
        // console.log(creep.room.memory.QueueAvailableResources[resource].amount);
        creep.target = resources[resource].id;
        target = creep.getTarget();
        console.log("Creep " + creep.pos + " has target " + resources[resource].resourceType);
        creep.memory.resourceType = resources[resource].resourceType;
        creep.memory.structure = resources[resource].structure;
        break;
      }
    }
  }

  if (target) {
    let result;
    if (creep.memory.structure === false) {
      result = creep.pickup(target, creep.memory.resourceType);
    } else {
      result = creep.withdraw(target, creep.memory.resourceType);
    }
    switch (result) {
      case OK:
      case ERR_NOT_ENOUGH_RESOURCES:
        creep.target = null;
        creep.memory.resourceType = null;
        creep.memory.structure = null;
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