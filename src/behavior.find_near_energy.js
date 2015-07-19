var Behavior = require("_behavior");

var RANGE_TO_ENERGY = 2;

function findEnergy(creep, rc) {
  var dropped = rc.find(FIND_DROPPED_ENERGY);
  return creep.pos.findInRange(dropped, RANGE_TO_ENERGY);
}


var b = new Behavior("find_near_energy");
b.when = function(creep, rc) {
  if (creep.energy === 0) {
    return (findEnergy(creep, rc).length > 0);
  }
  return false;
};
b.completed = function(creep, rc) {
  return (creep.energy > 0 || !creep.getTarget());
};
b.work = function(creep, rc) {
  var energy = creep.getTarget();
  if ( !energy ) {
    var dropped = findEnergy(creep, rc);
    if ( dropped.length ) {
      energy = dropped[0];
      creep.target = energy.id;
    }
  }

  if ( energy )  {
    if ( !creep.pos.isNearTo(energy) ){
      creep.moveToEx(energy);
    } else {
      creep.pickup(energy);
    }
  }
};
module.exports = b;
