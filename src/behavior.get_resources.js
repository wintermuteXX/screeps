var Behavior = require("_behavior");
var b = new Behavior("get_resources");

b.when = function (creep, rc) {
  Log.debug(`${creep} is running "when" in Tick ${Game.time}`, "get_resources");
  if (creep.energy > 0) return false;
  if (rc.getTransportOrder(creep) == (null || undefined)) return false;
  return true;
};

b.completed = function (creep, rc) {
  Log.debug(`${creep} is running "completed" in Tick ${Game.time}`, "get_resources");
  return (creep.energy > 0 || creep.target === null);
};

b.work = function (creep, rc) {
  Log.debug(`${creep} is running "work" in Tick ${Game.time}`, "get_resources");
  var target = creep.getTarget();

  if (!target) {
    var resource = rc.getTransportOrder(creep)
    if (resource !== null && resource !== undefined) {
      creep.target = resource.id;
      target = creep.getTarget();
      creep.memory.resourceType = resource.resourceType;
      creep.memory.amount = resource.amount;
    }
  }

  if (target) {
    let result;
    if (target.structureType !== undefined || target.deathTime !== undefined) { // deathTime is for tombstone check
      result = creep.withdraw(target, creep.memory.resourceType);
      Log.debug(`creep${creep} tries to withdraw ${creep.memory.resourceType} ${target}): ${result}`, "get_resources");
    } else {
      result = creep.pickup(target, creep.memory.resourceType);
      Log.debug(`creep${creep} tries to pickup ${creep.memory.resourceType} ${target}): ${result}`, "get_resources");
    }
    switch (result) {
      case OK:
        Log.info(`${creep} successfully transfers ${creep.memory.resourceType} to ${target}`, "get_resources");
        creep.target = null;
        break;
      case ERR_INVALID_TARGET:
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} had a problem. Status ${result} with target ${target}`, "get_resources");
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