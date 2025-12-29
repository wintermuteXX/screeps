const Log = require("./lib.log");
const duneConfig = require("./config.dune");

class ControllerSpawn {
  constructor(spawn, ControllerRoom) {
    this.spawn = spawn;
    this.ControllerRoom = ControllerRoom;
  }

  isIdle() {
    if (!this.spawn.spawning) {
      return this.spawn;
    }
    return null;
  }

  /**
   * Generiert einen zufälligen Dune-Namen für einen Creep
   * Verwendet die Fraktion des Raums oder namePrefix aus der Config
   * @param {string} role - Die Rolle des Creeps
   * @param {Object} creepConfig - Die Creep-Konfiguration
   * @returns {string} Ein verfügbarer Name
   */
  generateCreepName(role, creepConfig) {
    // Prüfe ob ein namePrefix in der Config definiert ist
    if (creepConfig && creepConfig.namePrefix) {
      return this._generateDuneName(creepConfig.namePrefix);
    }

    // Fallback: Verwende Dune-Personennamen basierend auf Fraktion
    const faction = this.ControllerRoom.getDuneFaction();

    // Fallback auf zufällige Fraktion wenn Raum noch keine hat
    const factionToUse = faction || duneConfig.getRandomFaction();
    const factionData = duneConfig.DUNE_NAMES[factionToUse];

    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Wähle zufällig einen Vornamen und Nachnamen
      const firstName = factionData.firstNames[Math.floor(Math.random() * factionData.firstNames.length)];
      const lastName = factionData.lastNames[Math.floor(Math.random() * factionData.lastNames.length)];

      // Kombiniere zu einem vollständigen Namen (Unterstriche statt Leerzeichen, da Screeps keine Leerzeichen erlaubt)
      const fullName = `${firstName  }_${  lastName}`;

      // Prüfe ob der Name bereits existiert
      if (!Game.creeps[fullName]) {
        return fullName;
      }
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

  createCreep(role, creepConfig, memory) {
    // TODO createCreep. Calculate Move parts dynamically
    // Initialize memory if not provided
    memory = memory || {};

    const theName = this.generateCreepName(role, creepConfig);

    // Use getUpgraderBody() if available, otherwise body
    let bodyTemplate = creepConfig.body;
    if (typeof creepConfig.getUpgraderBody === "function") {
      bodyTemplate = creepConfig.getUpgraderBody(this.ControllerRoom);
    }

    const bodyConfig = this.evalCreepBody(bodyTemplate, creepConfig.minParts, theName);
    let result = null;
    if (bodyConfig !== null && bodyConfig.length) {
      memory.role = role;
      memory.born = Game.time;
      memory.home = this.spawn.room.name;
      memory.bornEnergyLevel = this.spawn.room.energyCapacityAvailable;

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

      result = this.spawn.spawnCreep(bodyConfig, theName, {
        memory: memory,
      });
    }

    switch (result) {
      case OK:
        if (role === "claimer" && memory.targetRoom) {
          Log.success(`🏰 ${this.spawn} spawns claimer ${theName} targeting room ${memory.targetRoom}`, "createCreep");
        } else if (role === "supporter" && memory.targetRoom) {
          Log.success(`🚀 ${this.spawn} spawns supporter ${theName} targeting room ${memory.targetRoom}`, "createCreep");
        } else {
          Log.info(`${this.spawn} spawns creep: ${role}`, "createCreep");
        }
        return true;
      case null:
        Log.debug(`${this.spawn} createCreep returns: ${result}`, "createCreep");
        return false;
      default:
        Log.warn(`${this.spawn} unknown result in createCreep: ${global.getErrorString(result)}`, "createCreep");
        return false;
    }
  }

  evalCreepBody(body, minParts, theName) {
    const parts = _.clone(body);
    while (parts.length >= minParts) {
      if (this.spawn.spawnCreep(parts, theName, {
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
