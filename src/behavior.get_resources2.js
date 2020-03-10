var Behavior = require("_behavior");
var b = new Behavior("get_resources2");

b.when = function (creep, rc) {
  Log.info(`${creep} is running "when" in Tick ${Game.time}`, "get_resources2");
  if (rc.getTransportOrder(creep) == (null || undefined)) return false;
  if (creep.energy > 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  Log.info(`${creep} is running "completed" in Tick ${Game.time}`, "get_resources2");
  return (creep.energy > 0 || creep.target === null);
};

b.work = function (creep, rc) {
  Log.info(`${creep} is running "work" in Tick ${Game.time}`, "get_resources2");
  var target = creep.getTarget();

  if (!target) {
    var resource = rc.getTransportOrder(creep)
    if (resource !== (null || undefined)) {
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
      Log.info(`creep${creep} tries to withdraw ${creep.memory.resourceType} ${target}): ${result}`, "get_resources2");
    } else {
      result = creep.pickup(target, creep.memory.resourceType);
      Log.info(`creep${creep} tries to pickup ${creep.memory.resourceType} ${target}): ${result}`, "get_resources2");
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
        Log.warn(`unknown result from (creep ${creep}).pickup(${target}): ${result}`, "get_resources2");
    }
  }
};
module.exports = b;