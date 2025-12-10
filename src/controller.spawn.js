const Log = require("./lib.log");

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

  createCreep(role, creepConfig, memory) {
    // TODO createCreep. Calculate Move parts dynamically
    const theName = role + "_" + Math.round(Math.random() * 999);
    
    // Use getUpgraderBody() if available, otherwise body
    let bodyTemplate = creepConfig.body;
    if (typeof creepConfig.getUpgraderBody === 'function') {
      bodyTemplate = creepConfig.getUpgraderBody(this.ControllerRoom);
    }
    
    const bodyConfig = this.evalCreepBody(bodyTemplate, creepConfig.minParts, theName);
    let result = null;
    if (bodyConfig !== null && bodyConfig.length) {
      memory = memory || {};
      memory.role = role;
      memory.born = Game.time;
      memory.home = this.spawn.room.name;
      memory.bornEnergyLevel = this.spawn.room.energyCapacityAvailable;
      result = this.spawn.spawnCreep(bodyConfig, theName, {
        memory: memory
      });
    }

    switch (result) {
      case OK:
        Log.info(`${this.spawn} spawns creep: ${role}`, "createCreep");
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
          dryRun: true
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
