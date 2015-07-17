var Behavior = require("behavior.base");

var b = new Behavior("find_energy");

b.when = function(creep, rc) {
  return (creep.energy === 0);
};

b.completed = function(creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy === creep.energyCapacity);
};

b.work = function(creep, rc) {
  var target = Game.getObjectById(creep.target);

  if ( target === null ) {
    var droppedEnergy = rc.find(FIND_DROPPED_ENERGY);
    if ( droppedEnergy.length ) {
      target = droppedEnergy[0];
      creep.target = target.id;
    }
  }

  if ( target !== null ) {
    if ( !creep.pos.isNearTo(target) ) {
      creep.moveToEx(target);
    } else {
      creep.pickup(target);
      creep.target = null;
    }
  }
};

module.exports = b;
