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
    // This prevents the oscillation problem described in the wiki
    const { x, y } = creep.pos;
    if (x === 0 || x === 49 || y === 0 || y === 49) {
      // Calculate direction toward room center (25, 25)
      const dx = x === 0 ? 1 : (x === 49 ? -1 : 0);
      const dy = y === 0 ? 1 : (y === 49 ? -1 : 0);
      const direction = this._getDirection(dx, dy);
      creep.move(direction);
      return;
    }

    // Setup: store destination and target (if in correct room with mineral)
    if (creep.room.mineral) {
      // Always update target to current room's mineral
      if (!creep.memory.target) {
        creep.memory.target = creep.room.mineral.id;
      }
      // Set destination if not yet set
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
      creep.travelTo(destPos, { maxRooms: 1 });
      return;
    }

    // At destination - harvest mineral
    const target = Game.getObjectById(creep.memory.target);
    if (target) {
      const result = creep.harvest(target);
      // Only warn on unexpected errors (not cooldown or range issues)
      if (result !== OK && result !== ERR_NOT_IN_RANGE && result !== ERR_TIRED && result !== ERR_BUSY) {
        Log.warn(`${creep} harvest mineral error: ${global.getErrorString(result)}`, "Creep");
      }
    }
  }

  // Helper: Convert dx/dy to direction constant
  _getDirection(dx, dy) {
    if (dx === 0 && dy === -1) return TOP;
    if (dx === 1 && dy === -1) return TOP_RIGHT;
    if (dx === 1 && dy === 0) return RIGHT;
    if (dx === 1 && dy === 1) return BOTTOM_RIGHT;
    if (dx === 0 && dy === 1) return BOTTOM;
    if (dx === -1 && dy === 1) return BOTTOM_LEFT;
    if (dx === -1 && dy === 0) return LEFT;
    if (dx === -1 && dy === -1) return TOP_LEFT;
    return RIGHT; // fallback
  }
}

module.exports = new MinerHarvestMineralBehavior();
