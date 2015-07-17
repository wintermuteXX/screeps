var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_extensions");

function findExtension(rc) {
  return _.find(rc.find(FIND_MY_STRUCTURES), function(s){
    if (s.structureType === STRUCTURE_EXTENSION) {
          return s.energy < s.energyCapacity;
    }
    return false;
  });
}

b.when = function(creep, rc) {
  if ( creep.energy === 0 ) return false;

  var ext = findExtension(rc);

  return !!ext;
};

b.completed = function(creep, rc) {
  var ext = creep.getTarget();

  if ( creep.energy === 0 ) return true;
  if ( ext && ext.energy === ext.energyCapacity ) return true;
  if ( !ext ) return true;

  return false;
};

b.work = function(creep, rc) {
  var ext = creep.getTarget();

  if ( ext === null ) {
    ext = findExtension(rc);
    if ( ext ) {
      creep.target = ext.id;
    }
  }

  if ( ext ) {
    if ( !creep.pos.isNearTo(ext) ) {
      creep.moveToEx(ext);
    } else {
      creep.transferEnergy(ext);
    }
  }

};

module.exports = b;
