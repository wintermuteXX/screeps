var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_extensions");

var _cache = {};

function findExtension(rc) {
  if ( !_cache[rc.room.name] ) {
    _cache[rc.room.name] = _.filter(rc.find(FIND_MY_STRUCTURES), function(s){
      if (s.structureType === STRUCTURE_EXTENSION) {
            return s.energy < s.energyCapacity;
      }
      return false;
    });
  }
  return _cache[rc.room.name];
}

b.when = function(creep, rc) {
  if ( creep.energy === 0 ) return false;

  var ext = findExtension(rc);

  return ext.length > 0;
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
    if ( ext.length ) {
      ext = creep.pos.findClosestByRange(ext);
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
