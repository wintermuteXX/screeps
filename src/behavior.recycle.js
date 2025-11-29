var Behavior = require("_behavior");
const CONSTANTS = require("constants");

var b = new Behavior("recycle");

/**
 * Recycle-Behavior für Creeps die nicht mehr benötigt werden
 * Bringt den Creep zu einem Spawn um ihn zu recyceln und Energie zurückzubekommen
 * 
 * Verwendung: Als letztes Behavior in der Liste hinzufügen
 * z.B.: behaviors: ["miner_harvest_mineral", "recycle"]
 */

b.when = function (creep, rc) {
  // Recycle wenn:
  // 1. Keine anderen Behaviors mehr aktiv sind (dieses ist das letzte)
  // 2. Oder wenn Creep bald stirbt und recyceln lohnt sich noch
  
  // Prüfe ob es einen Spawn im Raum gibt
  const spawn = rc.getIdleSpawnObject() || rc.room.find(FIND_MY_SPAWNS)[0];
  if (!spawn) return false;
  
  // Recycle ist sinnvoll wenn:
  // - Das Mineral erschöpft ist (für mineral miner)
  // - Oder der Creep wenige Ticks übrig hat
  const mineralDepleted = creep.room.mineral && creep.room.mineral.mineralAmount === 0;
  const lowTicks = creep.ticksToLive < CONSTANTS.CREEP_LIFECYCLE.RECYCLE_THRESHOLD;
  
  return mineralDepleted || lowTicks;
};

b.completed = function (creep, rc) {
  // Nie "completed" - Creep wird recycelt und verschwindet
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
  
  // Dann: Zum Spawn gehen und recyceln
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
        // Spawn ist beschäftigt, warten
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

