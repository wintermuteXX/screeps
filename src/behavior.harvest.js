const Behavior = require("./behavior.base");
const Log = require("./lib.log");

class HarvestBehavior extends Behavior {
  constructor() {
    super("harvest");
  }

  when(creep, rc) {
    const sources = rc.getSourcesNotEmpty();
    return creep.store.getUsedCapacity() === 0 && sources.length > 0;
  }

  completed(creep, rc) {
    const target = creep.getTarget();
    if (!target) {
      return false;
    }
    if (target.energy === 0) {
      return true;
    }
    return creep.store.getUsedCapacity() === creep.store.getCapacity(RESOURCE_ENERGY);
  }

  work(creep, rc) {
    let target = creep.getTarget();

    if (target === null) {
      const sources = rc.getSourcesNotEmpty();
      if (sources && sources.length) {
        target = sources.selectBestSource(creep, rc);
      }
    }

    if (target !== null) {
      creep.target = target.id;
      if (!creep.pos.isNearTo(target)) {
        creep.travelTo(target);
      } else {
        const result = creep.harvest(target);
        if (result !== OK && result !== ERR_NOT_IN_RANGE) {
          // ERR_NOT_IN_RANGE is handled by travelTo above, only log other errors
          Log.warn(`${creep} harvest error from ${target}: ${global.getErrorString(result)}`, "harvest");
        }
      }
    }
  }
}

module.exports = new HarvestBehavior();
