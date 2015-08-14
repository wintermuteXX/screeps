var Behavior = require("_behavior");
var b = new Behavior("get_energy");
b.when = function(creep, rc) {
  if (rc.getCreeps('miner').length === 0) return false;
  if (rc.getCreeps('transporter').length === 0) return false;
  return (creep.energy === 0);
};
b.completed = function(creep, rc) {
  return (creep.energy > 0);
};
b.work = function(creep, rc) {
  var target = creep.getTarget();

  if ( target && target.energy === 0 ) {
    target = null;
  }

  if ( !target ) {
    var spawn = _.find(rc.find(FIND_MY_SPAWNS), function(s) {
      return s.energy > 0;
    });

    if ( spawn ) {
      target = spawn;
    } else {
      var extensions = _.filter(rc.getExtensions(), function(e) {
        return e.energy > 0;
      });

      if ( extensions.length ) {
        target = creep.pos.findClosestByRange(extensions);
      }
    }

    if ( target ) {
      creep.target = target.id;
    }

  }

  if ( target ) {
    if ( !creep.pos.isNearTo(target) ) {
      creep.moveToEx(target);
    } else {
      target.transferEnergy(creep);
    }
  }

};
module.exports = b;
