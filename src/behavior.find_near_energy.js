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
  var [thelink] = obj.pos.findInRange(links, 3);
  if (thelink && (thelink.energy != 0))
    return thelink;
}

var b = new Behavior("find_near_energy");

b.when = function (creep) {
  return (creep.energy === 0);
};

b.completed = function (creep, rc) {
  var target = creep.getTarget();

  if (creep.energy > 0 || !target) return true;
  // REMOVE
  /* if (target && target.structureType) {
    return target.energy === 0;
  } */

  return false;
};

b.work = function (creep, rc) {
  //TODO What a mess. Clean up
  var target = creep.getTarget();
  var controller = rc.getController();

  if (!target) {

    let link = findNearLink(controller, rc);
    if (link && link.energy > 0) {
      creep.target = link.id;
      target = creep.getTarget();
    } else if (creep.room.controller.container && _.sum(creep.room.controller.container.store) > 0) {
      creep.target = creep.room.controller.container.id
      target = creep.getTarget();
    } else {
      var dropped = findEnergy(controller, rc);
      if (dropped.length) {
        target = dropped[0];
        creep.target = target.id;
      } else {
        target = null;
      }
    }
  }

  if (target) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      if (target.structureType) {
        creep.withdraw(target, RESOURCE_ENERGY);
      } else {
        creep.pickup(target);
      }
    }
  }
};
module.exports = b;