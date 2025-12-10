const ControllerCreep = require("./controller.creep");
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

class CreepManager {
  constructor(roomController) {
    this.rc = roomController;
    this._creepController = null;
  }

  /**
   * Command all creeps in the room
   */
  commandCreeps() {
    if (!this._creepController) {
      this._creepController = new ControllerCreep(this.rc);
    }
    const creeps = this.rc.find(FIND_MY_CREEPS);

    for (const c in creeps) {
      this._creepController.run(creeps[c]);
    }
  }

  /**
   * Get creeps by role and/or target
   * @param {string|null} role - Creep role
   * @param {string|null} target - Target ID
   * @returns {Creep[]} Array of creeps
   */
  getCreeps(role, target) {
    let creeps = this.rc.find(FIND_MY_CREEPS);

    if (role || target) {
      const filter = {
        memory: {},
      };

      if (role) {
        filter.memory.role = role;
      }

      if (target) {
        filter.memory.target = target;
      }

      creeps = _.filter(creeps, filter);
    }

    return creeps;
  }

  /**
   * Get all creeps (including spawning ones)
   * Cached per tick - iterates Game.creeps only once
   * @param {string|null} role - Optional role filter
   * @returns {Creep[]} Array of creeps
   */
  getAllCreeps(role) {
    // Build cache if not exists (once per tick per room)
    if (!this.rc._creepsByRole) {
      // Use Object.create(null) to avoid prototype pollution (e.g. role named "constructor")
      this.rc._creepsByRole = Object.create(null);
      this.rc._creepsByRole._all = [];
      const room = this.rc.room;
      for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.room === room) {
          this.rc._creepsByRole._all.push(creep);
          const creepRole = creep.memory.role;
          if (creepRole) {
            if (!this.rc._creepsByRole[creepRole]) {
              this.rc._creepsByRole[creepRole] = [];
            }
            this.rc._creepsByRole[creepRole].push(creep);
          }
        }
      }
    }
    
    if (role) {
      return this.rc._creepsByRole[role] || [];
    }
    return this.rc._creepsByRole._all;
  }

  /**
   * Populate room with new creeps based on priorities
   */
  populate() {
    if (Game.time % CONSTANTS.TICKS.CHECK_POPULATION !== 0) {
      return;
    }

    let spawn = null;

    const roles = global.getCreepRoles();
    const cfgCreeps = global.getCreepsConfig();

    if (spawn === null) {
      spawn = this.rc.getIdleSpawn();
    }
    if (spawn === null) {
      return;
    }

    for (const i in roles) {
      const role = roles[i];

      const cfg = cfgCreeps[role];
      if (!cfg.produceGlobal || cfg.produceGlobal === false) {
        if (this._shouldCreateCreep(role, cfg)) {
          spawn.createCreep(role, cfg);
          return;
        }
      }
    }
  }

  /**
   * Check if a creep should be created
   * @param {string} role - Creep role
   * @param {Object} cfg - Creep config
   * @returns {boolean} True if creep should be created
   */
  _shouldCreateCreep(role, cfg) {
    const level = this.rc.getLevel();
    const lReq = cfg.levelMin || 1;
    const lMax = cfg.levelMax || 10;
    if (level < lReq) {
      return false;
    }
    if (lMax < level) {
      return false;
    }
    if (cfg.wait4maxEnergy === true && this.rc.room.energyCapacityAvailable > this.rc.room.energyAvailable) {
      return false;
    }
    if (!cfg.canBuild) {
      Log.error(role + " : no canBuild() implemented", "ControllerRoom");
      return false;
    }

    return cfg.canBuild(this.rc);
  }
}

module.exports = CreepManager;

