var Behavior = require("_behavior");
var b = new Behavior("transfer_resources");

b.when = function (creep, rc) {
  if (!creep.room.memory.QueueNeededResources) return false;
  if (creep.energy == 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  return (creep.energy == 0 || creep.target === null);
};

b.work = function (creep, rc) {
  Log.debug(`${creep} is running TRANSFER RESOURCES in Tick ${Game.time}`, "Creep")
  var target = creep.getTarget();

  if (!target) {
    var resources = creep.room.memory.QueueNeededResources;
    creep.target = null;
    for (var resource in resources) {
      if (resources[resource].amount > 0 && creep.memory.resourceType == resources[resource].resourceType) {
        creep.target = resources[resource].id;
        target = creep.getTarget();
        Log.info(`Creep ${creep.pos} will deliver ${resources[resource].resourceType} to ${resources[resource].id}`, "Creep");
        break;
      }
    }
    // Backup if no target found -> Terminal
    if (!target && creep.room.terminal) {
      Log.info(`Creep will deliver to Terminal (Backup): ${creep.name}`, "Creep");
      creep.target = creep.room.terminal.id;
      target = creep.getTarget();
    }
  }

  if (target) {
    for (let resource in creep.carry) {
      let res;
      if (resource.RESOURCE_ENERGY > 0) {res = "RESOURCE_ENERGY"} 
          else if (resource !== RESOURCE_ENERGY) {res = resource;}}
          console.log("Resource: " + res + creep.memory.resourceType);
    let result = creep.transfer(target, creep.memory.resourceType);

    switch (result) {
      case OK:
      case ERR_NOT_ENOUGH_RESOURCES:
        //creep.memory.resourceType = null;
      case ERR_FULL:
        creep.target = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;

      default:
        Log.warn(`unknown result from (creep ${creep}).transfer(${target}): ${result}`, "Creep");
    }
  }
};
module.exports = b;