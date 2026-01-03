const Behavior = require("./behavior.base");

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
        creep.harvest(target);
      }
    }
  }
}

module.exports = new HarvestBehavior();
