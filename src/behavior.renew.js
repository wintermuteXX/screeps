var Behavior = require("_behavior");
const CONSTANTS = require("constants");

// Cache für erstellte Behaviors
var behaviorCache = {};

/**
 * Konfiguration für verschiedene Renew-Modi
 */
var RENEW_CONFIGS = {
  normal: {
    // Normales Renew wenn Creep noch etwas Zeit hat
    whenThreshold: 1300,
    completedThreshold: 1400,
    checkEnergy: true,
  },
  emergency: {
    // Notfall-Renew wenn Creep fast stirbt
    whenThreshold: CONSTANTS.CREEP_LIFECYCLE.RENEW_EMERGENCY,
    completedThreshold: CONSTANTS.CREEP_LIFECYCLE.RENEW_NORMAL,
    checkEnergy: false,
  },
};

/**
 * Erstellt ein Renew-Behavior
 * Unterstützt: "renew", "renew:normal", "renew:emergency"
 */
function createRenewBehavior(behaviorName) {
  // Cache prüfen
  if (behaviorCache[behaviorName]) {
    return behaviorCache[behaviorName];
  }

  // Modus aus Behavior-Name parsen (Format: "renew:mode")
  var mode = "normal"; // Standard
  if (behaviorName.indexOf(":") !== -1) {
    mode = behaviorName.split(":")[1];
  }

  var config = RENEW_CONFIGS[mode];
  if (!config) {
    Log.warn(`Unknown renew mode '${mode}', using 'normal'`, "renew");
    config = RENEW_CONFIGS.normal;
  }

  var b = new Behavior(behaviorName);

  b.when = function (creep, rc) {
    // Nur wenn Creep mit aktuellem Energie-Level geboren wurde
    if (creep.memory.bornEnergyLevel !== creep.room.energyCapacityAvailable) {
      return false;
    }
    
    // Spawn muss verfügbar sein
    if (!rc.getIdleSpawnObject()) {
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
    
    // Fertig wenn über completedThreshold
    return creep.ticksToLive > config.completedThreshold;
  };

  b.work = function (creep, rc) {
    var target = creep.getTarget();

    if (!target) {
      target = rc.getIdleSpawnObject();
    }

    if (!target) {
      creep.memory.abort = true;
      return;
    }

    // Bei normalem Renew: prüfen ob Spawn Energie hat
    if (config.checkEnergy && (!target.store || target.store[RESOURCE_ENERGY] <= 0)) {
      creep.memory.abort = true;
      return;
    }

    creep.target = target.id;
    var result = target.renewCreep(creep);

    switch (result) {
      case OK:
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${creep} not enough resources for renew (${target}): ${result}`, "renew");
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
        Log.warn(`${creep} unknown result from renew (${target}): ${result}`, "renew");
        creep.memory.abort = true;
    }
  };

  // Cache speichern
  behaviorCache[behaviorName] = b;
  return b;
}

// Export als Factory-Funktion
module.exports = createRenewBehavior;
