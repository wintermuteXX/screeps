const Behavior = require("./behavior.base");
const Log = require("./lib.log");

class BuildStructuresBehavior extends Behavior {
  constructor() {
    super("build_structures");
  }

  when(creep, rc) {
    return creep.store.getUsedCapacity() > 0 && rc.find(FIND_CONSTRUCTION_SITES).length > 0;
  }

  completed(creep, rc) {
    const target = creep.getTarget();
    return creep.store.getUsedCapacity() === 0 || target === null;
  }

  work(creep, rc) {
    let target = creep.getTarget();
    if (target === null) {
      const constructions = rc.find(FIND_CONSTRUCTION_SITES);
      if (constructions.length) {
        target = constructions[0];
        creep.target = target.id;
      }
    }

    if (target !== null) {
      const result = creep.build(target);
      switch (result) {
        case OK:
          break;
        case ERR_NOT_IN_RANGE:
          creep.travelTo(target);
          break;
        case ERR_NO_BODYPART:
          Log.error(`${creep} has no Bodypart, should kill myself.  build (${target}): ${global.getErrorString(result)}`, "Creep");
          creep.suicide();
          break;
        default:
          Log.warn(`${creep} has unknown result from build ${target}: ${global.getErrorString(result)}`, "Creep");
          creep.target = null;
      }
    }
  }
}

module.exports = new BuildStructuresBehavior();
