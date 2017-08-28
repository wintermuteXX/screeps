function ControllerCreep(ControllerRoom) {
  this.ControllerRoom = ControllerRoom;
}

/**
 * ControllerCreep.run(creep)
 */
ControllerCreep.prototype.run = function (creep) {

  var config = global.getCreepConfig(creep.role);
  if (config !== null) {
    var behavior = global.getBehavior(creep.behavior);

    if (behavior === null || behavior.completed(creep, this.ControllerRoom)) {
      behavior = this.findBehavior(config, creep);
      creep.target = null;
    }

    if (behavior !== null) {
      if (creep.behavior !== behavior.name) {
        creep.behavior = behavior.name;
      }
     
      behavior.work(creep, this.ControllerRoom);

    } else {
      creep.behavior = null;
    }
  }
};

/**
 * ControllerCreep.findBehavior;
 */
ControllerCreep.prototype.findBehavior = function (config, creep) {
  var behaviors = config.behaviors;

  for (var i = 0; i < behaviors.length; i++) {
    var b = global.getBehavior(behaviors[i]);

    if (b !== null && b.when(creep, this.ControllerRoom)) {
      return b;
    }
  }

  return null;
};

module.exports = ControllerCreep;
