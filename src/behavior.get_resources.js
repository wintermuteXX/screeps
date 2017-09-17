var Behavior = require("_behavior");
var b = new Behavior("get_resources");

b.when = function (creep, rc) {
  if (!creep.room.memory._droppedResources) return false;
  if (creep.energy > 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  return (creep.energy > 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
      var resources = creep.room.memory._droppedResources;
      console.log("Creep " + creep.name + " has no target");
      for (var resource in resources) {
          console.log("Get Target: " + resource + " Type: " + resources[resource].resourceType);
          creep.target = resource;
          console.log("Creep " + creep.name + " has target " + resource);
          creep.memory.resourceType = resources[resource].resourceType;
          creep.memory.structure = resources[resource].structure;
          break;
      }
  }

  if (target) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      console.log("Get: " + target + " Type: " + creep.memory.resourceType);
      if (creep.memory.structure === false) {
      creep.pickup(target, creep.memory.resourceType); }
      else {
          creep.withdraw(target, creep.memory.resourceType); }
      creep.target = null;
      creep.memory.resourceType = null;
      creep.memory.structure = null;
      }
    }
};
module.exports = b;
