class ControllerCreep {
  constructor(ControllerRoom) {
    this.ControllerRoom = ControllerRoom;
  }

  /**
   * ControllerCreep.run(creep)
   */
  run(creep) {
    const config = global.getCreepConfig(creep.role);
    if (config !== null) {
      let behavior = global.getBehavior(creep.behavior);

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
  }

  /**
   * ControllerCreep.findBehavior
   */
  findBehavior(config, creep) {
    const {behaviors} = config;

    for (let i = 0; i < behaviors.length; i++) {
      const b = global.getBehavior(behaviors[i]);

      if (b !== null && b.when(creep, this.ControllerRoom)) {
        return b;
      }
    }

    return null;
  }
}

module.exports = ControllerCreep;
