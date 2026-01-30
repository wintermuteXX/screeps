const Behavior = require("./behavior.base");
const Log = require("./lib.log");

class MinerHarvestMineralBehavior extends Behavior {
  constructor() {
    super("miner_harvest_mineral");
  }

  when(creep, rc) {
    return (
      creep.room.extractor &&
      creep.room.mineral &&
      creep.room.mineral.mineralAmount > 0
    );
  }

  completed(creep) {
    return !creep.room.mineral || creep.room.mineral.mineralAmount === 0;
  }

  work(creep, rc) {
    if (!creep.room.mineral) {
      return;
    }

    let target = creep.getTarget();

    if (target === null) {
      creep.target = creep.room.mineral.id;
      target = Game.getObjectById(creep.target);
    }

    if (target !== null) {
      if (creep.room.extractor && creep.room.extractor.container) {
        const {container} = creep.room.extractor;
        creep.travelTo(container, { maxRooms: 1 });
      } else if (!creep.pos.isNearTo(target)) {
        creep.travelTo(target, { maxRooms: 1 });
      }
      if (Game.time % (EXTRACTOR_COOLDOWN + 1) === 0) {
        const result = creep.harvest(target);

        switch (result) {
          case OK:
          case ERR_NOT_IN_RANGE:
            break;
          default:
            Log.warn(`unknown result from (creep ${creep}).harvest mineral(${target}): ${global.getErrorString(result)}`, "Creep");
        }
      }
    }
  }
}

module.exports = new MinerHarvestMineralBehavior();
