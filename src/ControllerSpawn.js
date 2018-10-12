function ControllerSpawn(spawn, ControllerRoom) {
  this.spawn = spawn;
  this.ControllerRoom = ControllerRoom;
}

ControllerSpawn.prototype.idle = function () {
  return (this.spawn.spawning === null || this.spawn.spawning === undefined);
};

ControllerSpawn.prototype.createCreep = function (role, creepConfig, memory) {
  var theName = role + "_" + Math.round(Math.random() * 999);
  var bodyConfig = this.evalCreepBody(creepConfig.body2, creepConfig.minParts, theName);
  var result = null;
  if (bodyConfig !== null && bodyConfig.length) {
    memory = memory || {};
    memory.role = role;
    result = this.spawn.spawnCreep(bodyConfig, theName, {
      memory: memory
    });
  }

  if (result !== null) {
    console.log(this.spawn.pos + " Build creep: " + role);
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

ControllerSpawn.prototype.getCosts = function (body) {
  var costs = 0;

  if (body && body.length) {
    for (var index in body) {
      switch (body[index]) {
        case MOVE:
        case CARRY:
          costs += 50;
          break;

        case WORK:
          costs += 100;
          break;

        case ATTACK:
          costs += 80;
          break;

        case RANGED_ATTACK:
          costs += 150;
          break;

        case HEAL:
          costs += 250;
          break;

        case TOUGH:
          costs += 10;
          break;

        case CLAIM:
          costs += 600;
          break;
      }
    }
  }

  return costs;
};

module.exports = ControllerSpawn;