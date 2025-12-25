const Log = require("./lib.log");
const duneConfig = require("./config.dune");

class ControllerSpawn {
  constructor(spawn, ControllerRoom) {
    this.spawn = spawn;
    this.ControllerRoom = ControllerRoom;

    // Benenne Spawn nach dem Planeten des Raums
    this._renameSpawnToPlanet();
  }

  /**
   * Benennt den Spawn nach dem Planeten des Raums um (falls noch nicht geschehen)
   */
  _renameSpawnToPlanet() {
    const planet = this.ControllerRoom.getDunePlanet();
    if (!planet) {
      return; // Raum hat noch keine Dune-Identität
    }

    // Prüfe ob Spawn bereits umbenannt wurde
    const roomMemory = this.ControllerRoom._ensureRoomMemory();
    if (roomMemory.spawnRenamed && roomMemory.spawnRenamed[this.spawn.id]) {
      return; // Bereits umbenannt
    }

    // Versuche Spawn umzubenennen (nur wenn Name noch nicht gesetzt)
    // Hinweis: In Screeps können Spawns nicht umbenannt werden, aber wir können es im Memory speichern
    if (!roomMemory.spawnRenamed) {
      roomMemory.spawnRenamed = {};
    }
    roomMemory.spawnRenamed[this.spawn.id] = planet;

    // Log für Referenz (Spawn.name kann nicht geändert werden, aber wir wissen welcher Planet es ist)
    Log.info(`Spawn ${this.spawn.name} represents planet ${planet}`, "DuneSpawn");
  }

  isIdle() {
    if (!this.spawn.spawning) {
      return this.spawn;
    }
    return null;
  }

  /**
   * Generiert einen zufälligen Dune-Namen für einen Creep
   * Verwendet die Fraktion des Raums
   * @param {string} role - Die Rolle des Creeps
   * @returns {string} Ein verfügbarer Name
   */
  generateCreepName(role) {
    const faction = this.ControllerRoom.getDuneFaction();

    // Fallback auf zufällige Fraktion wenn Raum noch keine hat
    const factionToUse = faction || duneConfig.getRandomFaction();
    const factionData = duneConfig.DUNE_NAMES[factionToUse] || duneConfig.DUNE_NAMES.other;

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

  createCreep(role, creepConfig, memory) {
    // TODO createCreep. Calculate Move parts dynamically
    // Initialize memory if not provided
    memory = memory || {};

    const theName = this.generateCreepName(role);

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
