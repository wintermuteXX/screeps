const Behavior = require("./behavior.base");
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

/** Cheap long-range options — avoid ensurePath (can cost tens of CPU per tick). */
const TRAVEL_HOME = {
  preferHighway: true,
  maxOps: 20000,
};

const TRAVEL_LOCAL = {
  maxRooms: 1,
  maxOps: 5000,
};

/**
 * Recycle behavior for creeps that are no longer needed.
 * Brings the creep to a spawn to recycle it and recover energy.
 *
 * Usage: Add as last behavior in the list
 * e.g.: behaviors: ["miner_harvest_mineral", "recycle"]
 */
class RecycleBehavior extends Behavior {
  constructor() {
    super("recycle");
  }

  /**
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   * @returns {boolean}
   */
  when(creep, rc) {
    if (creep.memory.role === "scout" && creep.memory.scoutCompleted) {
      return true;
    }

    if (
      creep.memory.role === "miner_mineral" &&
      creep.room.mineral &&
      creep.room.mineral.mineralAmount === 0
    ) {
      return true;
    }

    return creep.ticksToLive < CONSTANTS.CREEP_LIFECYCLE.RECYCLE_THRESHOLD;
  }

  /**
   * @returns {boolean}
   */
  completed() {
    // Never completed — creep disappears when recycled
    return false;
  }

  /**
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   */
  work(creep, rc) {
    const spawn = this._getRecycleSpawn(creep, rc);
    if (!spawn) {
      const home = creep.memory.home;
      if (home && creep.room.name !== home) {
        creep.travelTo(new RoomPosition(25, 25, home), TRAVEL_HOME);
        return;
      }
      // No spawn and already home / no home — wait (avoid log spam)
      return;
    }

    if (creep.room.name !== spawn.pos.roomName) {
      creep.travelTo(spawn, TRAVEL_HOME);
      return;
    }

    if (creep.pos.isNearTo(spawn)) {
      const result = spawn.recycleCreep(creep);
      if (result === OK) {
        Log.success(`♻️ ${creep} recycled at ${spawn} in ${creep.room}`, "recycle");
      } else if (result !== ERR_BUSY && result !== ERR_NOT_IN_RANGE) {
        Log.warn(`${creep} recycle error: ${global.getErrorString(result)}`, "recycle");
      } else if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(spawn, TRAVEL_LOCAL);
      }
      return;
    }

    creep.travelTo(spawn, TRAVEL_LOCAL);
  }

  /**
   * Resolve a spawn to recycle at (cached in creep memory).
   * @param {Creep} creep
   * @param {import("./controller.room")} rc
   * @returns {StructureSpawn|null}
   */
  _getRecycleSpawn(creep, rc) {
    if (creep.memory.recycleSpawnId) {
      const cached = Game.getObjectById(creep.memory.recycleSpawnId);
      if (cached && cached.my && cached.structureType === STRUCTURE_SPAWN) {
        return cached;
      }
      delete creep.memory.recycleSpawnId;
    }

    let spawn = rc.getIdleSpawn();
    if (spawn && spawn.my) {
      creep.memory.recycleSpawnId = spawn.id;
      return spawn;
    }

    const homeName = creep.memory.home;
    const homeRoom = homeName ? Game.rooms[homeName] : null;
    if (homeRoom) {
      const homeSpawns = homeRoom.find(FIND_MY_SPAWNS);
      if (homeSpawns.length > 0) {
        creep.memory.recycleSpawnId = homeSpawns[0].id;
        return homeSpawns[0];
      }
    }

    return null;
  }
}

module.exports = new RecycleBehavior();
