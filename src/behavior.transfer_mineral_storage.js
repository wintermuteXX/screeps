var Behavior = require("_behavior");

var b = new Behavior("transfer_mineral_storage");

b.when = function (creep, rc) {
  if (creep.energy === 0) return false;
  var storage = creep.room.storage;
  if (!storage) return false;
  return (true);
};

b.completed = function (creep, rc) {
  var storage = creep.getTarget();

  if (creep.energy === 0) return true;
  if (storage && storage.store.energy === storage.storeCapacity) return true;

  return false;
};

b.work = function (creep, rc) {
  var storage = creep.getTarget();

  if (storage === null) {
    storage = rc.room.storage;
    if (storage) {
      creep.target = storage.id;
    }
  }

  if (storage) {
    if (!creep.pos.isNearTo(storage)) {
      creep.travelTo(storage);
    } else {
      creep.transferAllMineral(storage);
    }
  }

};

module.exports = b;
