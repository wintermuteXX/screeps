const Behavior = require("./behavior.base");
const Log = require("./lib.log");

class MinerHarvestMineralBehavior extends Behavior {
  constructor() {
    super("miner_harvest_mineral");
  }

  when(creep, rc) {
    // If creep has a stored destination, stay active (even in wrong room)
    if (creep.memory.mineralDest) {
      return true;
    }
    return (
      creep.room.extractor &&
      creep.room.mineral &&
      creep.room.mineral.mineralAmount > 0
    );
  }

  completed(creep) {
    const target = Game.getObjectById(creep.memory.target);
    if (target && target.mineralAmount === 0) {
      delete creep.memory.mineralDest;
      return true;
    }
    return !creep.room.mineral || creep.room.mineral.mineralAmount === 0;
  }

  work(creep, rc) {
    // CRITICAL: If on exit tile, move toward room center IMMEDIATELY
    // (use travelTo so Cartographer traffic manager tracks the intent)
    const { x, y } = creep.pos;
    if (x === 0 || x === 49 || y === 0 || y === 49) {
      creep.travelTo(new RoomPosition(25, 25, creep.room.name), {
        range: 20,
        maxRooms: 1,
      });
      return;
    }

    // Setup: ensure target and destination are set
    if (creep.room.mineral) {
      // Always ensure target is set when we have vision of the mineral
      if (!creep.memory.target) {
        creep.memory.target = creep.room.mineral.id;
      }
      // Store destination position if not set (works across rooms!)
      if (!creep.memory.mineralDest) {
        const dest = (creep.room.extractor && creep.room.extractor.container)
          ? creep.room.extractor.container.pos
          : creep.room.mineral.pos;
        creep.memory.mineralDest = { x: dest.x, y: dest.y, room: dest.roomName };
      }
    }

    const dest = creep.memory.mineralDest;
    if (!dest) return;

    // Create RoomPosition from stored data (works even without vision!)
    const destPos = new RoomPosition(dest.x, dest.y, dest.room);

    // Move to destination if not there
    if (!creep.pos.isEqualTo(destPos)) {
      creep.travelTo(destPos, { maxRooms: 1, range: 0 });
      return;
    }

    // At destination - harvest on cooldown
    const target = Game.getObjectById(creep.memory.target);
    if (target && Game.time % (EXTRACTOR_COOLDOWN + 1) === 0) {
      const result = creep.harvest(target);
      if (result !== OK && result !== ERR_NOT_IN_RANGE) {
        Log.warn(`${creep} harvest mineral error: ${global.getErrorString(result)}`, "Creep");
      }
    }
  }
}

module.exports = new MinerHarvestMineralBehavior();
