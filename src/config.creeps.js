/**
 * Generate a body array by repeating a pattern
 * @param {Array} pattern - Array of body parts to repeat (e.g., [MOVE, WORK])
 * @param {number} count - Number of times to repeat the pattern
 * @returns {Array} - Generated body array
 */
function generateBody(pattern, count) {
  const body = [];
  for (let i = 0; i < count; i++) {
    body.push(...pattern);
  }
  return body;
}

module.exports = {
  builder: {
    priority: 1,
    minParts: 4,
    wait4maxEnergy: false,
    body2: [MOVE, WORK, CARRY, MOVE],
    behaviors: ["get_resources", "harvest", "transfer_resources", "build_structures", "upgrade_controller"],

    canBuild: function (rc) {
      if (rc.getLevel() > 2) {
        return rc.getAllCreeps().length === 0;
      } else {
        // TODO This is not dynamic enough. Supporters have a log way. Usually there are too much builders. Take FreeSpaces into account
        return rc.getAllCreeps("builder").length + rc.getAllCreeps("supporter").length < 4;
      }
    },
  },

  miner: {
    // TODO miner - if idle - repair container
    // TODO miner - if link empty + container filled -> transfer to link.
    priority: 2,
    levelMin: 2,
    minParts: 3,
    wait4maxEnergy: false,
    body2: [MOVE, WORK, WORK, WORK, WORK, WORK, CARRY, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, MOVE],
    behaviors: ["miner_harvest"],

    canBuild: function (rc) {
      var miners = rc.getAllCreeps("miner");
      var sources = rc.getSources();
      return miners.length < sources.length;
    },
  },
  // LONGTERM miner - create moving miner

  miner_mineral: {
    priority: 5,
    levelMin: 6,
    minParts: 16,
    wait4maxEnergy: true,
    body2: generateBody([MOVE, WORK], 25), // 25 MOVE, 25 WORK
    behaviors: ["miner_harvest_mineral"],

    canBuild: function (rc) {
      var miners = rc.getAllCreeps("miner_mineral");
      return rc.room.extractor && rc.room.terminal && rc.getMineralAmount() > 0 && miners.length < 1 && _.sum(rc.room.terminal.store) < 270000;
    },
  },

  miner_commodity: {
    produceGlobal: false,
    priority: 6,
    levelMin: 5,
    minParts: 16,
    wait4maxEnergy: true,
    body2: generateBody([MOVE, WORK, MOVE, CARRY], 12), // 24 MOVE, 12 WORK, 12 CARRY
    behaviors: ["goto_green_flag", "miner_harvest_commodities", "goto_home", "transfer_storage"],

    canBuild: function (rc) {
      var miners = _.filter(Game.creeps, (c) => c.memory.role === "miner_commodity").length;
      return _.find(Game.flags, { color: COLOR_GREEN }) && miners < 1;
    },
  },

  miner_raid: {
    produceGlobal: false,
    priority: 6,
    levelMin: 5,
    minParts: 16,
    wait4maxEnergy: true,
    body2: generateBody([MOVE, WORK], 25), // 25 MOVE, 25 WORK
    behaviors: ["goto_yellow_flag", "miner_raid_room", "goto_home", "transfer_storage"],

    canBuild: function (rc) {
      return false;
    },
  },

  transporter: {
    priority: 3,
    levelMin: 2,
    minParts: 6,
    wait4maxEnergy: false,
    body2: generateBody([MOVE, CARRY], 16), // 16 MOVE, 16 CARRY
    behaviors: ["renew_emergency", "get_resources", "transfer_resources", "renew"],

    canBuild: function (rc) {
      const transporters = rc.getAllCreeps("transporter");
      const droppedAmount = rc.getDroppedResourcesAmount();
      let modifier = 0;
      if (droppedAmount > 5000) {
        Log.warn(`High amount of Dropped resources in ${rc.room}. Amount: ${droppedAmount}. Build additional transporter.`, "transporter");
        Game.notify(`High amount of Dropped resources in ${rc.room}. Amount: ${droppedAmount}. Build additional transporter.`);
        modifier = 1;
      }
      const level = rc.getLevel();
      if (level < 4) {
        return transporters.length < 4 + modifier;
      } else if (level < 7) {
        return transporters.length < 2 + modifier;
      } else {
        return transporters.length < 1;
      }
    },
  },

  upgrader: {
    priority: 4,
    levelMin: 1,
    levelMax: 7,
    minParts: 3,
    wait4maxEnergy: true,
    body2: [
      MOVE,
      WORK,
      CARRY,
      MOVE,
      WORK,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      CARRY,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
    ],
    behaviors: ["goto_controller", "find_near_energy", "upgrade_controller"],

    canBuild: function (rc) {
      var controller = rc.room.controller;

      function energyAround(obj) {
        var dropped = obj.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
          resourceType: RESOURCE_ENERGY,
        });
        let amount = 0;
        for (var d in dropped) {
          amount += dropped[d].amount;
        }
        return amount;
      }
      // Low Level
      if (rc.getLevel() <= 4) {
        return controller.my && rc.getAllCreeps("upgrader").length < 3;
      }
      if (rc.getLevel() == 5) {
        return controller.my && rc.getAllCreeps("upgrader").length < 2;
      }
      // High Level
      if (energyAround(controller) > 2000) {
        return controller && controller.my && rc.getAllCreeps("upgrader").length < 2;
      } else {
        return controller && controller.my && rc.getAllCreeps("upgrader").length < 1;
      }
    },
  },

  upgrader8: {
    priority: 4,
    levelMin: 8,
    minParts: 36,
    wait4maxEnergy: true,
    // Max 15 Energy per tick in RCL 8 needed
    body2: [
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      CARRY,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
      MOVE,
      WORK,
    ],
    behaviors: ["goto_controller", "find_near_energy", "upgrade_controller"],

    canBuild: function (rc) {
      var controller = rc.room.controller;
      return controller.my && rc.getAllCreeps("upgrader8").length < 1;
    },
  },

  constructor: {
    priority: 5,
    levelMin: 2,
    minParts: 4,
    wait4maxEnergy: true,
    body2: [
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
      MOVE,
      CARRY,
      MOVE,
      WORK,
    ],
    behaviors: ["renew_emergency", "build_structures", "repair"],

    canBuild: function (rc) {
      var towers = rc.room.towers;

      var structures = _.filter(rc.find(FIND_STRUCTURES), function (s) {
        return s.needsRepair();
      });
      if (rc.getLevel() < 4) {
        return (rc.find(FIND_CONSTRUCTION_SITES).length > 0 || (towers.length < 1 && structures.length > 0)) && rc.getAllCreeps("constructor").length < 2;
      } else {
        return (rc.find(FIND_CONSTRUCTION_SITES).length > 0 || (towers.length < 1 && structures.length > 0)) && rc.getAllCreeps("constructor").length < 1;
      }
    },
  },

  attacker: {
    produceGlobal: false,
    priority: 3,
    minLevel: 4,
    minParts: 6,
    wait4maxEnergy: true,
    body2: generateBody([MOVE, ATTACK], 25), // 25 MOVE, 25 ATTACK
    behaviors: ["goto_red_flag", "attack_enemy"],

    canBuild: function (rc) {
      const flags = _.filter(Game.flags, { color: COLOR_RED });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role === "attacker").length < 1;
    },
  },

  defender: {
    produceGlobal: false,
    priority: 3,
    minLevel: 2,
    minParts: 6,
    wait4maxEnergy: true,
    body2: generateBody([MOVE, RANGED_ATTACK], 25), // 25 MOVE, 25 RANGED_ATTACK
    // TODO Implement recycling
    behaviors: ["attack_enemy"],

    // TODO only build if no tower or boosted creeps enter room
    canBuild: function (rc) {
      return false;
    },
  },

  // TODO Supporter help rooms with RCL <= 3
  supporter: {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,
    minParts: 8,
    wait4maxEnergy: true,
    // 12x [MOVE, CARRY, MOVE, WORK] + [MOVE, WORK] = 25 MOVE, 12 CARRY, 13 WORK
    body2: [...generateBody([MOVE, CARRY, MOVE, WORK], 12), MOVE, WORK],
    behaviors: ["goto_white_flag", "clear_enemy_buildings", "get_resources", "harvest", "build_structures", "transfer_resources", "upgrade_controller"],

    canBuild: function (rc) {
      const flags = _.filter(Game.flags, { color: COLOR_WHITE });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role === "supporter").length < 3;
    },
  },

  claimer: {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,
    minParts: 4,
    wait4maxEnergy: true,
    body2: generateBody([MOVE, CLAIM], 2), // 2 MOVE, 2 CLAIM
    behaviors: ["goto_white_flag", "claim_controller", "place_spawn"],

    canBuild: function (rc) {
      const flags = _.filter(Game.flags, { color: COLOR_WHITE });
      if (flags.length === 0) return false;
      if (flags[0].room && flags[0].room.controller && flags[0].room.controller.my) return false;
      return _.filter(Game.creeps, (c) => c.memory.role === "claimer").length < 1;
    },
  },
};
