const Behavior = require("./behavior.base");
const CONSTANTS = require("./config.constants");

const b = new Behavior("miner_raid_room");

b.when = function (creep, rc) {
  return creep.store.getFreeCapacity() !== 0 && creep.ticksToLive >= 150;
};

b.completed = function (creep) {
  return creep.store.getFreeCapacity() === 0 || creep.ticksToLive < CONSTANTS.CREEP_LIFECYCLE.RENEW_EMERGENCY;
};

b.work = function (creep, rc) {
  let target = creep.getTarget();
  if (target === null && creep.room.storage) {
    creep.target = creep.room.storage.id;
    target = creep.room.storage;
  }

  if (target !== null && creep.pos.isNearTo(target)) {
    creep.withdraw(target, _.findKey(target.store));
  } else {
    creep.travelTo(target);
  }
};

module.exports = b;
