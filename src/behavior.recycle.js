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
  // 1. No other behaviors are active anymore (this is the last one)
  // 2. Or when creep is about to die and recycling is still worthwhile
  
  // Check if there is a spawn in the room
  const spawn = rc.getIdleSpawnObject() || rc.room.find(FIND_MY_SPAWNS)[0];
  if (!spawn) return false;
  
  // Recycling makes sense when:
  // - The mineral is depleted (for mineral miner)
  // - Or the creep has few ticks left
  const mineralDepleted = creep.room.mineral && creep.room.mineral.mineralAmount === 0;
  const lowTicks = creep.ticksToLive < CONSTANTS.CREEP_LIFECYCLE.RECYCLE_THRESHOLD;
  
  return mineralDepleted || lowTicks;
};

b.completed = function (creep, rc) {
  // Never "completed" - Creep will be recycled and disappear
  return false;
};

b.work = function (creep, rc) {
  // Zuerst: Ressourcen im Store abgeben (falls vorhanden)
  if (creep.store.getUsedCapacity() > 0) {
    const storage = creep.room.storage;
    const terminal = creep.room.terminal;
    const dropTarget = storage || terminal;
    
    if (dropTarget) {
      if (creep.pos.isNearTo(dropTarget)) {
        // Alle Ressourcen abgeben
        for (const resourceType in creep.store) {
          if (creep.store[resourceType] > 0) {
            creep.transfer(dropTarget, resourceType);
            return; // Ein Transfer pro Tick
          }
        }
      } else {
        creep.travelTo(dropTarget);
        return;
      }
    } else {
      // Kein Storage/Terminal - Ressourcen droppen
      for (const resourceType in creep.store) {
        if (creep.store[resourceType] > 0) {
          creep.drop(resourceType);
          return;
        }
      }
    }
  }
  
  // Then: Go to spawn and recycle
  const spawn = rc.getIdleSpawnObject() || creep.pos.findClosestByRange(FIND_MY_SPAWNS);
  
  if (!spawn) {
    Log.warn(`${creep} cannot be recycled - no spawn found`, "recycle");
    return;
  }
  
  if (creep.pos.isNearTo(spawn)) {
    const result = spawn.recycleCreep(creep);
    
    switch (result) {
      case OK:
        Log.info(`${creep} is being recycled at ${spawn}`, "recycle");
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

