var Behavior = require("_behavior");

var b = new Behavior("get_energy_dropped");

b.when = function (creep, rc) {
  var droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES);
  droppedEnergy = _.filter(droppedEnergy, function (f) {
    return f.amount > 99 && f.resourceType === 'energy' && !f.pos.inRangeTo(creep.room.controller.pos, 3);
  });

  return (creep.energy === 0 && droppedEnergy && droppedEnergy.length);
};

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy === creep.energyCapacity);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();


  if (target === null) {
    var droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES);
    //console.log("Dropped Energy: " + droppedEnergy);
    droppedEnergy = _.filter(droppedEnergy, function (f) {
      return f.amount > 99 && f.resourceType === 'energy' && !f.pos.inRangeTo(creep.room.controller.pos, 3);
    });
    //console.log("Dropped Energy 100: " + droppedEnergy);


    if (droppedEnergy.length) {
      target = droppedEnergy[Math.floor(Math.random() * droppedEnergy.length)];
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