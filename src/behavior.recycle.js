const Behavior = require("_behavior");
const CONSTANTS = require("./constants");
const Log = require("Log");

var b = new Behavior("recycle");

/**
 * Recycle behavior for creeps that are no longer needed
 * Brings the creep to a spawn to recycle it and recover energy
 *
 * Usage: Add as last behavior in the list
 * z.B.: behaviors: ["miner_harvest_mineral", "recycle"]
 */

b.when = function (creep, rc) {
  // Recycle when:
  // 1. Scout has nothing more to scout
  if (creep.memory.role === "scout" && creep.memory.scoutCompleted) {
    Log.info(`♻️ Scout ${creep.name} ready for recycling - scouting completed`, "recycle");
    return true;
  }

  // 2. Miner_mineral has depleted mineral
  const mineralDepleted = creep.room.mineral && creep.room.mineral.mineralAmount === 0;
  if (creep.memory.role === "miner_mineral" && mineralDepleted) {
    Log.info(`♻️ Miner ${creep.name} ready for recycling - mineral depleted`, "recycle");
    return true;
  }

  // 3. Creep has few ticks left (always recycle before death)
  const lowTicks = creep.ticksToLive < CONSTANTS.CREEP_LIFECYCLE.RECYCLE_THRESHOLD;
  if (lowTicks) {
    Log.info(`♻️ ${creep.name} ready for recycling - low ticks remaining (${creep.ticksToLive})`, "recycle");
    return true;
  }
  Log.warn(`♻️ ${creep.name} not ready for recycling - no reason found`, "recycle");
  return false;
};

b.completed = function (creep, rc) {
  // Never "completed" - Creep will be recycled and disappear
  return false;
};

b.work = function (creep, rc) {
  // First: Try to find spawn in current room
  let spawn = rc.getIdleSpawnObject() || creep.pos.findClosestByRange(FIND_MY_SPAWNS);
  
  // If no spawn in current room, go to home room
  if (!spawn) {
    const homeRoom = Game.rooms[creep.memory.home];
    if (homeRoom) {
      const homeSpawn = homeRoom.find(FIND_MY_SPAWNS)[0];
      if (homeSpawn) {
        // If we're not in home room, travel there first
        if (creep.room.name !== creep.memory.home) {
          Log.info(`♻️ ${creep.name} returning to home room ${creep.memory.home} for recycling`, "recycle");
          creep.travelTo(new RoomPosition(25, 25, creep.memory.home), {
            preferHighway: true,
            ensurePath: true,
            useFindRoute: true,
          });
          creep.say("🏠♻️");
          return;
        }
        spawn = homeSpawn;
      }
    }
  }
  
  if (!spawn) {
    Log.warn(`${creep} cannot be recycled - no spawn found`, "recycle");
    return;
  }
  
  if (creep.pos.isNearTo(spawn)) {
    const result = spawn.recycleCreep(creep);
    
    switch (result) {
      case OK:
        Log.success(`♻️ ${creep.name} is being recycled at ${spawn.name} in ${creep.room.name}`, "recycle");
        break;
      case ERR_BUSY:
        // Spawn is busy, waiting
        Log.debug(`${creep} waiting for spawn (busy)`, "recycle");
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(spawn);
        break;
      default:
        Log.warn(`${creep} Recycle-Fehler: ${result}`, "recycle");
    }
  } else {
    creep.travelTo(spawn);
    creep.say("♻️");
  }
};

module.exports = b;

