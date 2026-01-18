const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const RANGE_TO_ENERGY = 3;

class FindNearEnergyBehavior extends Behavior {
  constructor() {
    super("find_near_energy");
  }

  when(creep) {
    Log.info(`${creep.room} ${creep} is checking "when" condition`, "find_near_energy");
    return creep.store[RESOURCE_ENERGY] === 0;
  }

  completed(creep, rc) {
    Log.info(`${creep.room} ${creep} is checking "completed" condition`, "find_near_energy");
    // Completed when creep has energy
    if (creep.store[RESOURCE_ENERGY] > 0) return true;

    // If no energy but no target set, stay active to move to controller
    const target = creep.getTarget();
    if (!target && rc.room.controller) {
      return false; // Keep behavior active to move to controller
    }

    return false;
  }

  work(creep, rc) {
    Log.info(`${creep.room} ${creep} is performing "work" condition`, "find_near_energy");
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
          const dropped = controller.findNearbyDroppedEnergy(RANGE_TO_ENERGY);
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
          // Dropped resource - check if it is actually energy
          if (target.resourceType === RESOURCE_ENERGY) {
            result = creep.pickup(target);
          } else {
            // Wrong resource type - clear target
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
  }
}

module.exports = new FindNearEnergyBehavior();
