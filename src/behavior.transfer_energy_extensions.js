var Behavior = require("_behavior");
var b = new Behavior("transfer_energy_extensions");

b.when = function(creep, rc) {
  if ( creep.energy === 0 ) return false;

 
 var roomCache = global.Cache.rooms[creep.room.name];
 if ( roomCache ) {
     var ext = roomCache.emptyExtensions;
     if ( ext ) {
         return ext.length > 0;
     }
 }
 return false;
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
    ext = global.Cache.rooms[creep.room.name].emptyExtensions;
    if ( ext.length ) {
      ext = creep.pos.findClosestByRange(ext);
      creep.target = ext.id;
    }
  }

  if ( ext ) {
    if ( !creep.pos.isNearTo(ext) ) {
      creep.moveToEx(ext);
    } else {
      creep.transfer(ext);
      creep.target = null;
    }
  }

};

module.exports = b;
