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
   * Generate a random Dune-style name for a creep
   * Uses the room faction or namePrefix from config
   * @param {string} role - Creep role
   * @param {Object} creepConfig - Creep config
   * @returns {string} An available name
   */
  _generateCreepName(role, creepConfig) {
    // Use namePrefix from config when available
    if (creepConfig && creepConfig.namePrefix) {
      return this._generateDuneName(creepConfig.namePrefix);
    }

    // Fallback: use the legacy naming scheme
    return `${role  }_${  Math.round(Math.random() * 999)}`;
  }

  /**
   * Helper for generating Dune-style names with prefix and 3-digit number
   * @param {string} prefix - Name prefix (e.g. "Ornithopter", "Spice_Harvester")
   * @returns {string} An available name
   */
  _generateDuneName(prefix) {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate 3-digit random number (000-999)
      const randomNumber = Math.floor(Math.random() * 1000);
      const numberString = randomNumber.toString().padStart(3, "0");
      const name = `${prefix}_${numberString}`;

      // Check if the name already exists
      if (!Game.creeps[name]) {
        return name;
      }
    }

    // Fallback: use a timestamp-based suffix
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

      // Special handling for claimers: set target room in memory
      if (role === "claimer" && Memory.roomToClaim) {
        memory.targetRoom = Memory.roomToClaim;
        // Do not clear - will be cleared when room reaches RCL 3
      } else if (role === "claimer") {
        // Warn when a claimer is created without targetRoom
        Log.warn(`⚠️ Claimer ${theName} created without targetRoom (Memory.roomToClaim not set)`, "createCreep");
      }

      // Special handling for supporters: set target room in memory (uses roomToClaim)
      if (role === "supporter" && Memory.roomToClaim) {
        memory.targetRoom = Memory.roomToClaim;
        // Do not clear - roomToClaim is cleared when room reaches RCL 3
      } else if (role === "supporter") {
        // Warn when a supporter is created without targetRoom
        Log.warn(`⚠️ Supporter ${theName} created without targetRoom (Memory.roomToClaim not set)`, "createCreep");
      }

      result = spawn.spawnCreep(bodyConfig, theName, {
        memory: memory,
      });
    }
    switch (result) {
      case OK:
        if (role === "claimer") {
          if (memory.targetRoom) {
            Log.success(`🏰 ${spawn} spawns claimer ${theName} targeting room ${Game.rooms[memory.targetRoom]}`, "createCreep");
          } else {
            Log.warn(`🏰 ${spawn} spawns claimer ${theName} without target room`, "createCreep");
          }
        } else if (role === "supporter") {
          if (memory.targetRoom) {
            Log.success(`🚀 ${spawn} spawns supporter ${theName} targeting room ${Game.rooms[memory.targetRoom]}`, "createCreep");
          } else {
            Log.warn(`🚀 ${spawn} spawns supporter ${theName} without target room`, "createCreep");
          }
        } else {
          Log.info(`${spawn} spawns creep: ${role}`, "createCreep");
        }
        return true;
      case null:
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
