function ControllerSpawn(spawn, ControllerRoom) {
  this.spawn = spawn;
  this.ControllerRoom = ControllerRoom;
}

ControllerSpawn.prototype.createCreep = function (role, creepConfig, memory) {
  var theName = role + "_" + Math.round(Math.random() * 999);
  var bodyConfig = this.evalCreepBody(creepConfig.body2, creepConfig.minParts, theName);
  var result = null;
  if (bodyConfig !== null && bodyConfig.length) {
    memory = memory || {};
    memory.role = role;
    memory.renew = creepConfig.renew;
    memory.born = Game.time;
    memory.bornEnergyLevel = this.spawn.room.energyCapacityAvailable;
    result = this.spawn.spawnCreep(bodyConfig, theName, {
      memory: memory
    });
  }

  if (result !== null) {
    Log.warn(`${this.spawn.pos} Build creep: ${role}`, "Spawn")
    return (result === OK);
  }
  return false;
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