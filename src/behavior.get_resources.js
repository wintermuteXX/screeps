var Behavior = require("_behavior");
var b = new Behavior("get_resources");

b.when = function (creep, rc) {
  Log.info(`${creep} is running "when" in Tick ${Game.time}`, "get_resources");
  // FIXME Does not work when nothing needs to be transported, check must include if resource with amount is available (like in work)
    if (!creep.room.memory.QueueAvailableResources) return false;
  if (creep.energy > 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  Log.info(`${creep} is running "completed" in Tick ${Game.time}`, "get_resources");
  return (creep.energy > 0 || creep.target === null);
};

b.work = function (creep, rc) {
  Log.info(`${creep} is running "work" in Tick ${Game.time}`, "get_resources");
  var target = creep.getTarget();

  if (!target) {
    var resources = creep.room.memory.QueueAvailableResources;
    for (var resource in resources) {
      // check if the creep has same target -> abort
      if (resources[resource].amount > 0 && rc.getCreeps(null, resources[resource].id).length == 0) {
        creep.target = resources[resource].id;
        target = creep.getTarget();
        creep.memory.resourceType = resources[resource].resourceType;
        break;
      }
    }
  }

  if (target) {
    let result;
    // test if target is structure
    if (target.structureType === undefined) {
      result = creep.pickup(target, creep.memory.resourceType);
      Log.debug(`creep${creep} tries to pickup ${creep.memory.resourceType}${target}): ${result}`, "get_resources");
    } else {
      result = creep.withdraw(target, creep.memory.resourceType);
      Log.debug(`creep${creep} tries to withdraw ${creep.memory.resourceType}${target}): ${result}`, "get_resources");
    }
    switch (result) {
      case OK:
      case ERR_INVALID_TARGET:
      case ERR_NOT_ENOUGH_RESOURCES:
        creep.target = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;

      default:
        Log.warn(`unknown result from (creep ${creep}).pickup(${target}): ${result}`, "get_resources");
    }
  }
};
module.exports = b;