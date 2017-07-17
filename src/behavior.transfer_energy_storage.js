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
  var StoreLevel4 = 2000;
  var StoreLevel5 = 5000;
  var StoreLevel6 = 15000;
  var StoreLevel7 = 50000;
  var StoreLevel8 = 100000;
  
  if ( creep.room.controller.level === 4 && storage.store[RESOURCE_ENERGY] < StoreLevel4) {return !!storage;}
  if ( creep.room.controller.level === 5 && storage.store[RESOURCE_ENERGY] < StoreLevel5) {return !!storage;}
  if ( creep.room.controller.level === 6 && storage.store[RESOURCE_ENERGY] < StoreLevel6) {return !!storage;}
  if ( creep.room.controller.level === 7 && storage.store[RESOURCE_ENERGY] < StoreLevel7) {return !!storage;}
  if ( creep.room.controller.level === 8 && storage.store[RESOURCE_ENERGY] < StoreLevel8) {return !!storage;}
  
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
