const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const RANGE_TO_ENERGY = 3;

function findEnergy(obj, rc) {
  const dropped = rc.find(FIND_DROPPED_RESOURCES, {
    filter: {
      resourceType: RESOURCE_ENERGY,
    },
  });
  return obj.pos.findInRange(dropped, RANGE_TO_ENERGY);
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
  Log.info(`${creep.room.name} ${creep.name} is performing "work" condition`, "find_near_energy");
  let target = creep.getTarget();
  const {controller} = rc.room;

  if (!target && controller) {
    const link = rc.findNearLink(controller, { linkType: 'receivers', requireEnergy: true });
    if (link) {
      creep.target = link.id;
      target = creep.getTarget();
    } else {
      const {container} = creep.room.controller;
      if (container && container.store && container.store[RESOURCE_ENERGY] > 0) {
        creep.target = container.id;
        target = creep.getTarget();
      }
      if (!target) {
        const dropped = findEnergy(controller, rc);
        if (dropped.length) {
          target = dropped[0];
          creep.target = target.id;
        } else {
          target = null;
        }
      }
    }
  }

  if (target && controller) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      let result;
      if (target.structureType) {
        result = creep.withdraw(target, RESOURCE_ENERGY);
      } else {
        // DroppedResource - prüfe ob es wirklich Energy ist
        if (target.resourceType === RESOURCE_ENERGY) {
          result = creep.pickup(target);
        } else {
          // Falsche Ressourcenart - Target löschen
          creep.target = null;
          result = ERR_INVALID_ARGS;
        }
      }

      // Check if withdraw/pickup was successful, delete target if not
      if (result !== OK) {
        creep.target = null;
      }
    }
  } else if (controller && !target) {
    // No energy found, but move to controller anyway to be ready when energy arrives
    if (!creep.pos.isNearTo(controller)) {
      creep.travelTo(controller, { range: 3 });
    }
  }
};
module.exports = b;
