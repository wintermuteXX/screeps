var Behavior = require("_behavior");
var b = new Behavior("transfer_resources");

b.when = function (creep, rc) {
  if (!creep.room.memory.QueueNeededResources) return false;
  if (creep.energy === 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  if (creep.energy === 0) return true;
  let tar = creep.getTarget();
  if (!tar) return true;
  return false;
};

b.work = function (creep, rc) {
  Log.debug(`${creep} is running TRANSFER RESOURCES in Tick ${Game.time}`, "Creep")
  let target = creep.getTarget();
  let creepRes = _.findKey(creep.carry);

  if (!target) {
    var resources = creep.room.memory.QueueNeededResources;
    creep.target = null;
    for (var resource in resources) {
      if (resources[resource].amount > 0 && creepRes == resources[resource].resourceType) {
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
    let result = creep.transfer(target, creepRes);

    switch (result) {
      case OK:
      case ERR_NOT_ENOUGH_RESOURCES:
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