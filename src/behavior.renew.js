const Behavior = require("./behavior.base");
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

// Cache for created behaviors
const behaviorCache = {};

/**
 * Configuration for different renew modes
 */
const RENEW_CONFIGS = {
  normal: {
    // Normal renew when creep still has some time left
    whenThreshold: 1300,
    completedThreshold: 1400,
    checkEnergy: true,
  },
  emergency: {
    // Emergency renew when creep is about to die
    whenThreshold: CONSTANTS.CREEP_LIFECYCLE.RENEW_EMERGENCY,
    completedThreshold: CONSTANTS.CREEP_LIFECYCLE.RENEW_NORMAL,
    checkEnergy: false,
  },
};

/**
 * Erstellt ein Renew-Behavior
 * Supports: "renew", "renew:normal", "renew:emergency"
 */
function createRenewBehavior(behaviorName) {
  // Check cache
  if (behaviorCache[behaviorName]) {
    return behaviorCache[behaviorName];
  }

  // Parse mode from behavior name (format: "renew:mode")
  let mode = "normal"; // Standard
  if (behaviorName.indexOf(":") !== -1) {
    mode = behaviorName.split(":")[1];
  }

  let config = RENEW_CONFIGS[mode];
  if (!config) {
    Log.warn(`Unknown renew mode '${mode}', using 'normal'`, "renew");
    config = RENEW_CONFIGS.normal;
  }

  const b = new Behavior(behaviorName);

  b.when = function (creep, rc) {
    // Only if creep was born with current energy level
    if (creep.memory.bornEnergyLevel !== creep.room.energyCapacityAvailable) {
      return false;
    }
    
    // Creep should not have CLAIM body parts (cannot be renewed)
    const hasClaimParts = creep.body.some(part => part.type === CLAIM);
    if (hasClaimParts) {
      return false;
    }
    
    // Spawn must be available
    const spawn = rc.getIdleSpawnObject();
    if (!spawn) {
      return false;
    }
    
    // For normal renew: check if spawn has energy
    if (config.checkEnergy && (!spawn.store || spawn.store[RESOURCE_ENERGY] <= 0)) {
      return false;
    }
    
    // Ticks unter Schwellwert
    return creep.ticksToLive < config.whenThreshold;
  };

  b.completed = function (creep, rc) {
    // Abbruch-Flag gesetzt
    if (creep.memory.abort) {
      creep.memory.abort = false;
      return true;
    }
    
    // Done when above completedThreshold
    return creep.ticksToLive > config.completedThreshold;
  };

  b.work = function (creep, rc) {
    let target = creep.getTarget();

    if (!target) {
      target = rc.getIdleSpawnObject();
    }

    if (!target) {
      creep.memory.abort = true;
      return;
    }

    // For normal renew: check if spawn has energy
    if (config.checkEnergy && (!target.store || target.store[RESOURCE_ENERGY] <= 0)) {
      creep.memory.abort = true;
      return;
    }

    creep.target = target.id;
    const result = target.renewCreep(creep);

    switch (result) {
      case OK:
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.info(`${creep} not enough resources for renew in ${target}: ${global.getErrorString(result)}`, "renew");
        creep.memory.abort = true;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;
      case ERR_BUSY:
      case ERR_FULL:
        creep.memory.abort = true;
        break;
      default:
        Log.warn(`${creep} unknown result from renew ${target}: ${global.getErrorString(result)}`, "renew");
        creep.memory.abort = true;
    }
  };

  // Cache speichern
  behaviorCache[behaviorName] = b;
  return b;
}

// Export als Factory-Funktion
module.exports = createRenewBehavior;
