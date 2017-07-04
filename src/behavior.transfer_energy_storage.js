var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_storage");

function findStorage(rc) {
  var s = rc.room.storage;
  // TODO: 100000 in Konstante auslagern
  if (s && s.store.energy < 100000) {
    return s;
  }
  return null;
}

b.when = function (creep, rc) {
  if (creep.energy === 0) return false;
  var storage = findStorage(rc);
  return (!!storage);
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
    storage = findStorage(rc);
    if (storage) {
      creep.target = storage.id;
    }
  }

  if (storage) {
    if (!creep.pos.isNearTo(storage)) {
      creep.travelTo(storage);
    } else {
      creep.transfer(storage, RESOURCE_ENERGY);
    }
  }

};

module.exports = b;
