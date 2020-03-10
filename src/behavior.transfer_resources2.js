var Behavior = require("_behavior");
var b = new Behavior("transfer_resources2");

b.when = function (creep, rc) {
  Log.info(`${creep} is checking "when" in transfer_resources`, "transfer_resources2")
  if (rc.getDeliveryOrder(creep) == (null || undefined)) return false;
  if (creep.energy === 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  Log.info(`${creep} is checking "completed" in transfer_resources`, "transfer_resources2")
  if (creep.energy === 0) return true;
  let tar = creep.getTarget();
  if (!tar) return true;
  return false;
};

b.work = function (creep, rc) {
  Log.info(`${creep} is performing "work" in transfer_resources`, "transfer_resources2")
  let target = creep.getTarget();
  let creepRes = _.findKey(creep.carry);

  if (!target || target === null) {
    creep.target = null;
    let job = rc.getDeliveryOrder(creep);
    if (job !== (null || undefined)) {

      let theObject = Game.getObjectById(job.id)
      if (theObject && job.amount > 0) {
        creep.target = job.id;
        creep.amount = job.amount;
        target = creep.getTarget();
        Log.debug(`${creep} will deliver ${job.resourceType} to ${target} `, "transfer_resources2");
        break;
      }
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
        Log.info(`${creep} ${target} is full. This shouldn't happen anymore`, "transfer_resources2");
        creep.target = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;

      default:
        Log.warn(`unknown result from ${creep}. Transfer to (${target}): ${result}`, "transfer_resources2");
    }
  }
};
module.exports = b;