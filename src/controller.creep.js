const { getCreepConfig } = require("./utils.creeps");
const Log = require("./lib.log");

// CPU threshold for behavior warning (temporary debugging)
const BEHAVIOR_CPU_THRESHOLD = 0.5;

class ControllerCreep {
  constructor(ControllerRoom) {
    this.ControllerRoom = ControllerRoom;
  }

  /**
   * ControllerCreep.run(creep)
   */
  run(creep) {
    const config = getCreepConfig(creep.role);
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

        const start = Game.cpu.getUsed();
        behavior.work(creep, this.ControllerRoom);
        const delta = Game.cpu.getUsed() - start;
        if (delta > BEHAVIOR_CPU_THRESHOLD) {
          Log.warn(`[CPU] ${creep.room} ${creep} behavior "${behavior.name}": ${delta.toFixed(2)} CPU`, "CPU");
        }

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
