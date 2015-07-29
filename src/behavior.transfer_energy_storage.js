var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_storage");

function findStorage(rc) {
  return _.find(rc.find(FIND_MY_STRUCTURES), function(s){
    if ( s.structureType === STRUCTURE_STORAGE ) {
        return s.store.energy < s.storeCapacity;
    }
    return false;
  });
}

b.when = function(creep, rc) {
  if (creep.energy === 0) return false;
  var storage = findStorage(rc);
  return (!!storage);
};

b.completed = function(creep, rc) {
  var storage = creep.getTarget();

  if (creep.energy === 0) return true;
  if ( storage && storage.store.energy === storage.storeCapacity ) return true;



  if (link && link.energy === link.energyCapacity) return true;

  return false;
};

b.work = function(creep, rc) {
  var storage = creep.getTarget();

  if (storage === null) {
    storage = findStorage(rc);
    if ( storage ) {
      creep.target = storage.id;
    }
  }

  if (storage) {
    if (!creep.pos.isNearTo(storage)) {
      creep.moveToEx(storage);
    } else {
      creep.transferEnergy(storage);
    }
  }

};

module.exports = b;
