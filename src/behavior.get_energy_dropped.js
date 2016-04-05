var Behavior = require("_behavior");

var b = new Behavior("get_energy_dropped");

var _cache = {};

 /* function findDroppedEnergy(rc) {
  if ( !_cache[rc.room.name] ) {
    var dropped = rc.find(FIND_DROPPED_ENERGY);
    _cache[rc.room.name] = _.filter(dropped, function(d) {
      return !d.pos.inRangeTo(rc.getController(), 2);
    });
  }

  return _cache[rc.room.name];
 } */

b.when = function(creep, rc) {
  return (creep.energy === 0 && global.Cache.rooms[creep.room.name].droppedResources.length);
};

b.completed = function(creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy === creep.energyCapacity);
};

b.work = function(creep, rc) {
  var target = creep.getTarget();


  if ( target === null ) {
    var droppedEnergy = global.Cache.rooms[creep.room.name].droppedResources;
    // console.log("Dropped Energy: " + droppedEnergy);
    // console.log("Dropped E Cache: " + global.Cache.rooms[creep.room.name].droppedResources);
    if ( droppedEnergy.length ) {
      target = droppedEnergy[Math.floor(Math.random() * droppedEnergy.length)];
      // target = droppedEnergy[0];
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
