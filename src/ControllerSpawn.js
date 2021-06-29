function ControllerSpawn(spawn, ControllerRoom) {
  this.spawn = spawn;
  this.ControllerRoom = ControllerRoom;
}

ControllerSpawn.prototype.isIdle = function () {

  if (!this.spawn.spawning) {
    return this.spawn;
  }
  return null;
};

ControllerSpawn.prototype.createCreep = function (role, creepConfig, memory) {
  // TODO createCreep. Calculate Move parts dynamically
  var theName = role + "_" + Math.round(Math.random() * 999);
  var bodyConfig = this.evalCreepBody(creepConfig.body2, creepConfig.minParts, theName);
  var result = null;
  if (bodyConfig !== null && bodyConfig.length) {
    memory = memory || {};
    memory.role = role;
    memory.born = Game.time;
    memory.bornEnergyLevel = this.spawn.room.energyCapacityAvailable;
    result = this.spawn.spawnCreep(bodyConfig, theName, {
      memory: memory
    });
  }

  switch (result) {
    case OK:
      Log.success(`${this.spawn} spawns creep: ${role}`, "createCreep")
      return true;
      break;
    case null:
      Log.debug(`createCreep returns: ${result}`, "createCreep");
      return false;
      break;
    default:
      Log.warn(`unknown result in createCreep: ${result}`, "createCreep");
      return false;
  }
};

ControllerSpawn.prototype.evalCreepBody = function (body, minParts, theName) {
  var parts = _.clone(body);
  while (parts.length >= minParts) {
    if (this.spawn.spawnCreep(parts, theName, {
        dryRun: true
      }) == 0) {
      return parts;
    } else {
      parts.pop();
    }
  }

  return null;
};

module.exports = ControllerSpawn;