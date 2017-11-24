var Behavior = require("_behavior");
var b = new Behavior("transfer_resources");

b.when = function (creep, rc) {
  if (!creep.room.memory.QueueNeededResources) return false;
  if (creep.energy == 0) return false;

  var resources = creep.room.memory.QueueNeededResources;
  for (var resource in resources) {
    if (resources[resource].amount > 0 && creep.memory.resourceType == resources[resource].resourceType) {
      return true;
    }
  }
  return false;
};

b.completed = function (creep, rc) {
  return (creep.energy == 0 || creep.target === null);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
    var resources = creep.room.memory.QueueNeededResources;
    creep.target = null;
    for (var resource in resources) {
      if (resources[resource].amount > 0 && creep.memory.resourceType == resources[resource].resourceType) {
        creep.target = resources[resource].id;
        target = creep.getTarget();
        // console.log("Creep " + creep.pos + " will deliver " + resources[resource].resourceType);
        break;
      }
    }
    // Backup if no target found -> Terminal
    //if(!target && creep.room.terminal) {creep.target = creep.room.terminal.id; target = creep.getTarget();}
  }

  if (target) {
    let result = creep.transfer(target, creep.memory.resourceType);

    switch (result) {
      case OK:
      case ERR_NOT_ENOUGH_RESOURCES:
        if (creep.energy === 0) creep.memory.resourceType = null;
      case ERR_FULL:
        creep.target = null;
        creep.memory.structure = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;

      default:
        console.log(`unknown result from (creep ${creep}).transfer(${target}): ${result}`);
    }
  }
};
module.exports = b;