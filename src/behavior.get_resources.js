var Behavior = require("_behavior");
var b = new Behavior("get_resources");

b.when = function (creep, rc) {
  if (!creep.room.memory._droppedResources) return false;
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
    var resources = creep.room.memory._droppedResources;
    for (var resource in resources) {
      if (resources[resource].amount > 0) {
        creep.room.memory._droppedResources[resource].amount = creep.room.memory._droppedResources[resource].amount - _.sum(creep.carry);
        target = resources[resource].id;
        creep.target = target;
        console.log("Creep " + creep.name + " has target " + resources[resource].resourceType);
        creep.memory.resourceType = resources[resource].resourceType;
        creep.memory.structure = resources[resource].structure;
        break;
      }
    }
  }

  if (target) {
    if (creep.memory.structure === false) {
      let result = creep.pickup(target, creep.memory.resourceType);
      switch (result) {
        case OK:
          creep.target = null;
          creep.memory.resourceType = null;
          creep.memory.structure = null;
          break;
        case ERR_NOT_IN_RANGE:
          creep.travelTo(target);
          break;
        case ERR_NOT_ENOUGH_RESOURCES:
          creep.target = null;
          creep.memory.resourceType = null;
          creep.memory.structure = null;
          break;
        default:
          console.log(`unknown result from (creep ${creep}).pickup(${target}): ${result}`);
      }
    } else {
      let result = creep.withdraw(target, creep.memory.resourceType);
      switch (result) {
        case OK:
          creep.target = null;
          creep.memory.resourceType = null;
          creep.memory.structure = null;
          break;
        case ERR_NOT_IN_RANGE:
          creep.travelTo(target);
          break;
        case ERR_NOT_ENOUGH_RESOURCES:
          creep.target = null;
          creep.memory.resourceType = null;
          creep.memory.structure = null;
          break;
        default:
          console.log(`unknown result from (creep ${creep}).withdraw(${target}): ${result}`);
      }
    }
  }
};
module.exports = b;