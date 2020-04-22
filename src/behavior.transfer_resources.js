var Behavior = require("_behavior");
var b = new Behavior("transfer_resources");

b.when = function (creep, rc) {
  Log.debug(`${creep} is checking "when" in transfer_resources`, "transfer_resources")
  if (creep.energy === 0) return false;
  if (rc.getDeliveryOrder(creep) == (null || undefined)) return false;
  return true;
};

b.completed = function (creep, rc) {
  Log.debug(`${creep} is checking "completed" in transfer_resources`, "transfer_resources")
  if (creep.energy === 0) return true;
  let tar = creep.getTarget();
  if (!tar) return true;
  return false;
};

b.work = function (creep, rc) {
  Log.debug(`${creep} is performing "work" in transfer_resources`, "transfer_resources")
  let target = creep.getTarget();
  let creepRes = _.findKey(creep.store);
  if (!target || target === null) {
    creep.target = null;
    let job = rc.getDeliveryOrder(creep);
    if (job !== (null || undefined)) {

      let theObject = Game.getObjectById(job.id)
      if (theObject && job.amount > 0) {
        creep.target = job.id;
        creep.amount = job.amount;
        target = creep.getTarget();
        Log.debug(`${creep} will deliver ${job.resourceType} to ${target} `, "transfer_resources");
      }
    }
  };

  if (target) {
    let result = creep.transfer(target, creepRes);

    switch (result) {
      case OK:
        Log.info(`${creep} successfully transfers ${creep.memory.resourceType} to ${target}`, "transfer_resources");
        creep.target = null;
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} had not enough resources. Why is this happening? Investigate!`, "transfer_resources");
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