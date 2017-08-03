var Behavior = require("_behavior");

var b = new Behavior("get_minerals");

b.when = function (creep, rc) {
  var droppedMinerals = creep.room.find(FIND_DROPPED_RESOURCES);
  droppedMinerals = _.filter(droppedMinerals, function (f) { return  !f.resourceType == 'energy' && !f.resourceType == 'power' });
   
  return (_.sum(creep.carry) === 0 && droppedMinerals && droppedMinerals.length);
};

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || _.sum(creep.carry) === creep.energyCapacity);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();


  if (target === null) {
    var droppedMinerals = creep.room.find(FIND_DROPPED_RESOURCES);
    droppedMinerals = _.filter(droppedMinerals, function (f) { return !f.resourceType == 'energy' && !f.resourceType == 'power' });
  
    if (droppedMinerals.length) {
      target = droppedMinerals[Math.floor(Math.random() * droppedMinerals.length)];
      creep.target = target.id;
    }
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      creep.pickup(target);
      creep.target = null;
    }
  }
};

module.exports = b;
