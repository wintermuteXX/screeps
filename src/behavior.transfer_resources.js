var Behavior = require("_behavior");
var b = new Behavior("transfer_resources");

b.when = function (creep, rc) {
  Log.info(`${creep} is checking "when" in transfer_resources`, "transfer_resources")
  if (!creep.room.memory.QueueNeededResources) return false;
  if (creep.energy === 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  Log.info(`${creep} is checking "completed" in transfer_resources`, "transfer_resources")
  if (creep.energy === 0) return true;
  let tar = creep.getTarget();
  if (!tar) return true;
  return false;
};

b.work = function (creep, rc) {
  Log.info(`${creep} is performing "work" in transfer_resources`, "transfer_resources")
  let target = creep.getTarget();
  let creepRes = _.findKey(creep.carry);

  if (!target || target === null) {
    var resources = creep.room.memory.QueueNeededResources;
    creep.target = null;
    for (var resource in resources) {
      // TEST Controller container still buggy?
      // && rc.getCreeps(null, resources[resource].id).length == 0
      if (resources[resource].amount > 0 && creepRes == resources[resource].resourceType) {
        creep.target = resources[resource].id;
        target = creep.getTarget();
        Log.debug(`${creep} will deliver ${resources[resource].resourceType} to ${target} `, "transfer_resources");
        break;
      }
    }
    // Backup if no target found -> Terminal
    if (!target && creep.room.terminal && (creep.room.terminal.storeCapacity > _.sum(creep.room.terminal.store))) {
      Log.debug(`${creep} will deliver to Terminal (Backup)`, "transfer_resources");
      creep.target = creep.room.terminal.id;
      target = creep.getTarget();
    }
  }

  if (target) {
    let result = creep.transfer(target, creepRes);

    switch (result) {
      case OK:
      case ERR_NOT_ENOUGH_RESOURCES:
        creep.target = null;
        break;
      case ERR_FULL:
        Log.info(`${creep} ${target} is full. This shouldn't happen anymore`, "transfer_resources");
        creep.target = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;

      default:
        Log.warn(`unknown result from ${creep}. Transfer to (${target}): ${result}`, "transfer_resources");
    }
  }
};
module.exports = b;