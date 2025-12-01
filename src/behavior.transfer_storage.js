const Behavior = require("_behavior");
const Log = require("Log");
const b = new Behavior("transfer_storage");

/**
 * Transferiert alle Ressourcen zum Storage
 * Fallback: Terminal wenn kein Storage vorhanden
 */

b.when = function (creep, rc) {
  // Only if creep carries something and Storage/Terminal exists
  return creep.store.getUsedCapacity() > 0 && (creep.room.storage || creep.room.terminal);
};

b.completed = function (creep, rc) {
  return creep.store.getUsedCapacity() === 0;
};

b.work = function (creep, rc) {
  // Ziel: Storage bevorzugt, sonst Terminal
  const target = creep.room.storage || creep.room.terminal;
  
  if (!target) {
    Log.warn(`${creep} has no Storage/Terminal for delivery`, "transfer_storage");
    return;
  }

  // Finde erste Ressource im Store
  const resourceType = _.findKey(creep.store);
  if (!resourceType) return;

  const result = creep.transfer(target, resourceType);
  
  switch (result) {
    case OK:
      Log.debug(`${creep} transfers ${resourceType} to ${target.structureType}`, "transfer_storage");
      break;
    case ERR_NOT_IN_RANGE:
      creep.travelTo(target);
      break;
    case ERR_FULL:
      Log.warn(`${target.structureType} is full`, "transfer_storage");
      break;
    default:
      Log.warn(`${creep} Transfer-Fehler: ${result}`, "transfer_storage");
  }
};

module.exports = b;
