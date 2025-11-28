var Behavior = require("_behavior");
const CONSTANTS = require("constants");

var b = new Behavior("miner_raid_room");

b.when = function (creep, rc) {
  return creep.store.getFreeCapacity() !== 0 && creep.ticksToLive >= 150;
};

b.completed = function (creep) {
  // console.log(creep.name + " " + creep.ticksToLive + " " + creep.store.getFreeCapacity());
  return creep.store.getFreeCapacity() == 0 || creep.ticksToLive < CONSTANTS.CREEP_LIFECYCLE.RENEW_EMERGENCY;
};

b.work = function (creep, rc) {
  var target = creep.getTarget();
  if (target === null && creep.room.storage) {
    creep.target = creep.room.storage.id;
    target = creep.room.storage;
  }

  if (target !== null && creep.pos.isNearTo(target)) {
    // console.log(_.findKey(target.store));
    creep.withdraw(target, _.findKey(target.store));
  } else {
    creep.travelTo(target);
  }
};

module.exports = b;
