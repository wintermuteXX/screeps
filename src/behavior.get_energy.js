var Behavior = require("_behavior");
var b = new Behavior("get_energy");
b.when = function(creep, rc) {
  return (creep.energy === 0);
};
b.completed = function(creep, rc) {
  return (creep.energy > 0);
};
b.work = function(creep, rc) {
  var spawn = creep.getTarget();

  if ( !spawn ) {
    spawn = _.find(rc.find(FIND_MY_SPAWNS), function(s) {
      return s.energy > 0;
    });

    if ( spawn ) {
      creep.target = spawn.id;
    }
  }

  if ( spawn ) {
    if ( !creep.pos.isNearTo(spawn) ) {
      creep.moveToEx(spawn);
    } else {
      spawn.transferEnergy(creep);
    }
  }

};
module.exports = b;
