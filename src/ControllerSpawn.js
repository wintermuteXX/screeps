function ControllerSpawn(spawn, ControllerRoom) {
  this.spawn = spawn;
  this.ControllerRoom = ControllerRoom;
}

ControllerSpawn.prototype.idle = function () {
  return (this.spawn.spawning === null || this.spawn.spawning === undefined);
};

ControllerSpawn.prototype.createCreep = function (role, creepConfig, memory) {
  var bodyConfig = this.evalCreepBody(this.ControllerRoom.getLevel(), creepConfig.body2);
  var result = null;
  if (bodyConfig !== null && bodyConfig.length) {
    var name = role + "_" + Math.round(Math.random() * 999);
    if (this.spawn.canCreateCreep(bodyConfig, name) == OK) {
      // init creep memory
      memory = memory || {};
      memory.role = role;

      result = this.spawn.createCreep(bodyConfig, name, memory);
    }
  }

  if (result !== null) {
    console.log(this.spawn.room.name + " Build creep: " + role);
    return (result === OK);
  }
  return false;
};

ControllerSpawn.prototype.evalCreepBody = function (level, body) {
  /*var maxEnergy = this.ControllerRoom.room.energyCapacityAvailable;

  var start = (body.length < level ? body.length : level) - 1;

  for (var i = start; i >= 0; i--) {
    var parts = body[i];
    if (parts && parts.length && this.getCosts(parts) <= maxEnergy) {
      return parts;
    }
  }
  return null;*/
  var j = body.length;
	for (var i = 0; i < j - 2; i++) {
		var result = this.spawn.canCreateCreep(body);
		if (result === 0) {
			return body;
		} else {
			body.pop();
		}
	}
	return false;
  
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