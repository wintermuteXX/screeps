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
  Log.info(`${creep.room.name} ${creep.name} is checking "when" condition`, "find_near_energy")
  return (creep.energy === 0);
};

b.completed = function (creep) {
  Log.info(`${creep.room.name} ${creep.name} is checking "completed" condition`, "find_near_energy")
  var target = creep.getTarget();
  if (creep.energy > 0 || !target) return true;
  return false;
};

b.work = function (creep, rc) {
  Log.info(`${creep.room.name} ${creep.name} is is performing "work" condition`, "find_near_energy")
  var target = creep.getTarget();
  var controller = rc.room.controller;

  if (!target && controller) {

    let link = findNearLink(controller, rc);
    if (link && link.energy > 0) {
      Log.debug(`${creep.room.name} ${creep.name} is trying to get energy from Link: ${link}`, "find_near_energy")
      creep.target = link.id;
      target = creep.getTarget();
    } else if (creep.room.controller.container && _.sum(creep.room.controller.container.store) > 0) {
      Log.debug(`${creep.room.name} ${creep.name} is trying to get energy from Container: ${creep.room.controller.container}`, "find_near_energy")
      creep.target = creep.room.controller.container.id
      target = creep.getTarget();
    } else {
      var dropped = findEnergy(controller, rc);
      if (dropped.length) {
        Log.debug(`${creep.room.name} ${creep.name} is trying to get energy from ground: ${dropped}`, "find_near_energy")
        target = dropped[0];
        creep.target = target.id;
      } else {
        Log.debug(`${creep.room.name} ${creep.name} found no energy around Controller`, "find_near_energy")
        target = null;
      }
    }
  }

  if (target && controller) {
    if (!creep.pos.isNearTo(target)) {
      Log.debug(`${creep.room.name} ${creep.name} is moving to target: ${target}`, "find_near_energy")
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