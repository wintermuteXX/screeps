var Behavior = require("_behavior");

// Used by Upgrader
//TODO Maybe delete and integrate in upgrade_controller
var RANGE_TO_ENERGY = 3;

function findEnergy(obj, rc) {
  var dropped = rc.find(FIND_DROPPED_RESOURCES, {
    filter: {
      resourceType: RESOURCE_ENERGY
    }
  });
  return obj.pos.findInRange(dropped, RANGE_TO_ENERGY);
}

function findNearLink(obj, rc) {
  var links = rc.links.receivers;
  var thelink = obj.pos.findInRange(links, 3);
  if (thelink && (thelink.energy != 0))
    return thelink;
}

var b = new Behavior("find_near_energy");

b.when = function (creep, rc) {
  if (creep.energy === 0) {
    var controller = rc.getController();
    var energy = findEnergy(controller, rc);
    var link = findNearLink(controller, rc);
    return (energy.length > 0 || link);
  }
  return false;
};
b.completed = function (creep, rc) {
  var target = creep.getTarget();

  if (creep.energy > 0 || !target) return true;
  if (target && target.structureType) {
    return target.energy === 0;
  }

  return false;
};
b.work = function (creep, rc) {
  var energy = creep.getTarget();
  var controller = rc.getController();


  if (!energy) {

    if (creep.room.controller.container && _.sum(creep.room.controller.container.store) > 0) {
      creep.target = creep.room.controller.container.id
      energy = creep.getTarget();
    } else {
      var dropped = findEnergy(controller, rc);
      if (dropped.length) {
        energy = dropped[0];
        creep.target = energy.id;
      }
    }
  }

  if (!energy) {
    energy = findNearLink(controller, rc);
    if (energy.length && energy[0].energy > 0) {
      energy = energy[0];
      creep.target = energy.id;
    } else {
      energy = null;
    }
  }

  if (energy) {
    if (!creep.pos.isNearTo(energy)) {
      creep.travelTo(energy);
    } else {
      if (energy.structureType) {
        creep.withdraw(energy, RESOURCE_ENERGY);
      } else {
        creep.pickup(energy);
      }
    }
  }
};
module.exports = b;