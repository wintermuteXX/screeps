const Log = require("./lib.log");

class ControllerSpawn {
  constructor(rc) {
    this.room = rc;
    this.spawns = rc.room.spawns.filter(s => s.my);
  }

  /**
   * Checks if a spawn is idle
   * @param {StructureSpawn} spawn - The spawn to check
   * @returns {boolean} True if spawn is idle
   */
  _isIdle(spawn) {
    return !spawn.spawning;
  }

  /**
   * Generiert einen zufälligen Dune-Namen für einen Creep
   * Verwendet die Fraktion des Raums oder namePrefix aus der Config
   * @param {string} role - Die Rolle des Creeps
   * @param {Object} creepConfig - Die Creep-Konfiguration
   * @returns {string} Ein verfügbarer Name
   */
  _generateCreepName(role, creepConfig) {
    // Prüfe ob ein namePrefix in der Config definiert ist
    if (creepConfig && creepConfig.namePrefix) {
      return this._generateDuneName(creepConfig.namePrefix);
    }

    // Fallback: Verwende das alte System wenn alle Namen belegt sind
    return `${role  }_${  Math.round(Math.random() * 999)}`;
  }

  /**
   * Generische Hilfsfunktion zum Generieren von Dune-Namen mit Präfix und 3-stelliger Nummer
   * @param {string} prefix - Der Präfix für den Namen (z.B. "Ornithopter", "Spice_Harvester")
   * @returns {string} Ein verfügbarer Name
   */
  _generateDuneName(prefix) {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generiere 3-stellige Zufallszahl (000-999)
      const randomNumber = Math.floor(Math.random() * 1000);
      const numberString = randomNumber.toString().padStart(3, "0");
      const name = `${prefix}_${numberString}`;

      // Prüfe ob der Name bereits existiert
      if (!Game.creeps[name]) {
        return name;
      }
    }

    // Fallback: Verwende Timestamp wenn alle Namen belegt sind
    return `${prefix}_${(Game.time % 1000).toString().padStart(3, "0")}`;
  }

  /**
   * Gets the first idle spawn
   * @returns {StructureSpawn|null} Spawn object or null
   */
  getIdle() {
    for (const spawn of this.spawns) {
      if (this._isIdle(spawn)) {
        return spawn;
      }
    }
    return null;
  }

  /**
   * Creates a creep using the specified spawn
   * @param {StructureSpawn} spawn - The spawn to use
   * @param {string} role - The role of the creep
   * @param {Object} creepConfig - The creep configuration
   * @param {Object} memory - Optional memory object
   * @returns {boolean} True if successful
   */
  createCreep(spawn, role, creepConfig, memory) {
    // TODO createCreep. Calculate Move parts dynamically
    // Initialize memory if not provided
    memory = memory || {};

    const theName = this._generateCreepName(role, creepConfig);

    // Use getUpgraderBody() if available, otherwise body
    let bodyTemplate = creepConfig.body;
    if (typeof creepConfig.getUpgraderBody === "function") {
      bodyTemplate = creepConfig.getUpgraderBody(this.room);
    }

    const bodyConfig = this._evalCreepBody(spawn, bodyTemplate, creepConfig.minParts, theName);
    let result = null;
    if (bodyConfig !== null && bodyConfig.length) {
      memory.role = role;
      memory.born = Game.time;
      memory.home = spawn.room.name;
      memory.bornEnergyLevel = spawn.room.energyCapacityAvailable;

      // Spezielle Behandlung für Claimer: Setze Zielraum im Memory
      if (role === "claimer" && Memory.roomToClaim) {
        memory.targetRoom = Memory.roomToClaim;
        // NICHT löschen - wird erst gelöscht wenn Raum RCL 3 erreicht hat
      }

      // Spezielle Behandlung für Supporter: Setze Zielraum im Memory (nutzt roomToClaim)
      if (role === "supporter" && Memory.roomToClaim) {
        memory.targetRoom = Memory.roomToClaim;
        // NICHT löschen - roomToClaim wird erst gelöscht wenn Raum RCL 3 erreicht hat
      }

      result = spawn.spawnCreep(bodyConfig, theName, {
        memory: memory,
      });
    }

    switch (result) {
      case OK:
        if (role === "claimer" && memory.targetRoom) {
          Log.success(`🏰 ${spawn} spawns claimer ${theName} targeting room ${memory.targetRoom}`, "createCreep");
        } else if (role === "supporter" && memory.targetRoom) {
          Log.success(`🚀 ${spawn} spawns supporter ${theName} targeting room ${memory.targetRoom}`, "createCreep");
        } else {
          Log.info(`${spawn} spawns creep: ${role}`, "createCreep");
        }
        return true;
      case null:
        Log.debug(`${spawn} createCreep returns: ${result}`, "createCreep");
        return false;
      default:
        Log.warn(`${spawn} unknown result in createCreep: ${global.getErrorString(result)}`, "createCreep");
        return false;
    }
  }

  /**
   * Evaluates the creep body by trying different sizes
   * @param {StructureSpawn} spawn - The spawn to use for dry run
   * @param {Array} body - The body template
   * @param {number} minParts - Minimum number of parts
   * @param {string} theName - The name to use for dry run
   * @returns {Array|null} Valid body array or null
   */
  _evalCreepBody(spawn, body, minParts, theName) {
    const parts = _.clone(body);
    while (parts.length >= minParts) {
      if (spawn.spawnCreep(parts, theName, {
        dryRun: true,
      }) === 0) {
        return parts;
      } else {
        parts.pop();
      }
    }

    return null;
  }
}

module.exports = ControllerSpawn;
