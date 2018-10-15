var Behavior = require("_behavior");
var b = new Behavior("transfer_energy_upgrader");

b.when = function (creep, rc) {
  return (creep.energy > 0 && rc.getCreeps('upgrader').length);
};

b.completed = function (creep, rc) {
  return (creep.energy === 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
    if (creep.room.controller.container && _.sum(creep.room.controller.container.store)) {
      target = creep.room.controller.container;
      creep.target = target.id;
    } else {
      target = rc.getController();
      creep.target = target.id;
    }
  }

  if (target) {
    if (target.structureType == STRUCTURE_CONTAINER) {
      if (!creep.pos.isNearTo(target)) {
        creep.travelTo(target);
      } else {
        creep.transfer(target, RESOURCE_ENERGY)
      }
    }

    if (target.structureType == STRUCTURE_CONTROLLER) {
      if (!creep.pos.inRangeTo(target, 3)) {
        creep.travelTo(target);
      } else {
        creep.drop(RESOURCE_ENERGY);
      }
    }
  }
};
module.exports = b;