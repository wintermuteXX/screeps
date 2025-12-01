const Behavior = require("_behavior");
const b = new Behavior("miner_harvest_commodities");

b.when = function (creep, rc) {
    const deposits = rc.find(FIND_DEPOSITS);
    return deposits.length > 0 && creep.store.getFreeCapacity() !== 0 && creep.ticksToLive >= 350;
};

b.completed = function (creep, rc) {
    const deposits = rc.find(FIND_DEPOSITS);
    return creep.store.getFreeCapacity() === 0 || creep.ticksToLive < 250 || deposits.length === 0;
};

b.work = function (creep, rc) {
  let target = creep.getTarget();

  if (target === null) {
    const deposits = rc.find(FIND_DEPOSITS);
    if (deposits.length) {
      creep.target = deposits[0].id;
      target = deposits[0];
    }
  }

  if (target !== null && creep.pos.isNearTo(target) && target.cooldown === 0) {
    creep.harvest(target);
  } else {
    creep.travelTo(target);
  }
};

module.exports = b;