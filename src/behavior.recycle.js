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
    Log.info(`♻️ Scout ${creep} ready for recycling - scouting completed`, "recycle");
    return true;
  }

  // 2. Miner_mineral has depleted mineral
  const mineralDepleted = creep.room.mineral && creep.room.mineral.mineralAmount === 0;
  if (creep.memory.role === "miner_mineral" && mineralDepleted) {
    Log.info(`♻️ Miner ${creep} ready for recycling - mineral depleted`, "recycle");
    return true;
  }

  // 3. Creep has few ticks left (always recycle before death)
  const lowTicks = creep.ticksToLive < CONSTANTS.CREEP_LIFECYCLE.RECYCLE_THRESHOLD;
  if (lowTicks) {
    Log.info(`♻️ ${creep} ready for recycling - low ticks remaining (${creep.ticksToLive})`, "recycle");
    return true;
  }
  Log.warn(`♻️ ${creep} not ready for recycling - no reason found`, "recycle");
  return false;
};

b.completed = function (creep, rc) {
  // Never "completed" - Creep will be recycled and disappear
  return false;
};

b.work = function (creep, rc) {
  // First: Try to find spawn in current room (only own spawns)
  let spawn = rc.getIdleSpawnObject();
  if (spawn && !spawn.my) {
    spawn = null; // Not our spawn, ignore it
  }
    
  // If no spawn in current room, go to home room
  if (!spawn) {
    const homeRoom = Game.rooms[creep.memory.home];
    if (homeRoom) {
      const homeSpawns = homeRoom.find(FIND_MY_SPAWNS);
      if (homeSpawns.length > 0) {
        const homeSpawn = homeSpawns[0];
        // Verify it's our spawn
        if (homeSpawn && homeSpawn.my) {
          // If we're not in home room, travel there first
          if (creep.room.name !== creep.memory.home) {
            Log.info(`♻️ ${creep} returning to home room ${creep.memory.home} for recycling`, "recycle");
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
  }
  
  // Verify spawn is ours before proceeding
  if (!spawn || !spawn.my) {
    Log.warn(`${creep} cannot be recycled - no own spawn found in current room or home room`, "recycle");
    return;
  }
  
  if (creep.pos.isNearTo(spawn)) {
    const result = spawn.recycleCreep(creep);
    
    switch (result) {
      case OK:
        Log.success(`♻️ ${creep} is being recycled at ${spawn} in ${creep.room}`, "recycle");
        break;
      case ERR_BUSY:
        // Spawn is busy, waiting
        Log.debug(`${creep} waiting for spawn (busy)`, "recycle");
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(spawn);
        break;
      default:
        Log.warn(`${creep} Recycle-Fehler: ${global.getErrorString(result)}`, "recycle");
    }
  } else {
    creep.travelTo(spawn);
    creep.say("♻️");
  }
};

module.exports = b;

