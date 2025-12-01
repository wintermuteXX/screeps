const Behavior = require("_behavior");
const Log = require("Log");
const RANGE_TO_ENERGY = 3;

function findEnergy(obj, rc) {
  const dropped = rc.find(FIND_DROPPED_RESOURCES, {
    filter: {
      resourceType: RESOURCE_ENERGY,
    },
  });
  return obj.pos.findInRange(dropped, RANGE_TO_ENERGY);
}

function findNearLink(obj, rc) {
  const links = rc.links.receivers;
  const [thelink] = obj.pos.findInRange(links, 3);
  if (thelink && thelink.energy != 0) return thelink;
}

const b = new Behavior("find_near_energy");

b.when = function (creep) {
  Log.info(`${creep.room.name} ${creep.name} is checking "when" condition`, "find_near_energy");
  return creep.store[RESOURCE_ENERGY] === 0;
};

b.completed = function (creep, rc) {
  Log.info(`${creep.room.name} ${creep.name} is checking "completed" condition`, "find_near_energy");
  // Completed when creep has energy
  if (creep.store[RESOURCE_ENERGY] > 0) return true;
  
  // If no energy but no target set, stay active to move to controller
  const target = creep.getTarget();
  if (!target && rc.room.controller) {
    return false; // Keep behavior active to move to controller
  }
  
  return false;
};

b.work = function (creep, rc) {
  Log.info(`${creep.room.name} ${creep.name} is is performing "work" condition`, "find_near_energy");
  let target = creep.getTarget();
  const controller = rc.room.controller;

  if (!target && controller) {
    let link = findNearLink(controller, rc);
    if (link && link.energy > 0) {
      Log.debug(`${creep.room.name} ${creep.name} is trying to get energy from Link: ${link}`, "find_near_energy");
      creep.target = link.id;
      target = creep.getTarget();
    } else if (creep.room.controller.container && creep.room.controller.container.store && creep.room.controller.container.store[RESOURCE_ENERGY] > 0) {
      Log.debug(`${creep.room.name} ${creep.name} is trying to get energy from Container: ${creep.room.controller.container}`, "find_near_energy");
      creep.target = creep.room.controller.container.id;
      target = creep.getTarget();
    } else {
      const dropped = findEnergy(controller, rc);
      if (dropped.length) {
        Log.debug(`${creep.room.name} ${creep.name} is trying to get energy from ground: ${dropped}`, "find_near_energy");
        target = dropped[0];
        creep.target = target.id;
      } else {
        Log.debug(`${creep.room.name} ${creep.name} found no energy around Controller`, "find_near_energy");
        target = null;
      }
    }
  }

  if (target && controller) {
    // TODO Add a check if withdraw/pickup is successful (and delete target if not)
    if (!creep.pos.isNearTo(target)) {
      Log.debug(`${creep.room.name} ${creep.name} is moving to target: ${target}`, "find_near_energy");
      creep.travelTo(target);
    } else {
      if (target.structureType) {
        creep.withdraw(target, RESOURCE_ENERGY);
      } else {
        creep.pickup(target);
      }
    }
  } else if (controller && !target) {
    // No energy found, but move to controller anyway to be ready when energy arrives
    if (!creep.pos.isNearTo(controller)) {
      Log.debug(`${creep.room.name} ${creep.name} found no energy, moving to controller to wait`, "find_near_energy");
      creep.travelTo(controller, { range: 3 });
    }
  }
};
module.exports = b;
