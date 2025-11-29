/**
 * Generate a body array by repeating a pattern
 * @param {Array} pattern - Array of body parts to repeat (e.g., [MOVE, WORK])
 * @param {number} count - Number of times to repeat the pattern
 * @returns {Array} - Generated body array
 */
const CONSTANTS = require("constants");

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
        return rc.getAllCreeps("builder").length + rc.getAllCreeps("supporter").length < CONSTANTS.CREEP_LIMITS.BUILDER_MAX_LOW_LEVEL;
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
    behaviors: ["miner_harvest_mineral", "recycle"],

    canBuild: function (rc) {
      var miners = rc.getAllCreeps("miner_mineral");
      return rc.room.extractor && rc.room.terminal && rc.getMineralAmount() > 0 && miners.length < CONSTANTS.CREEP_LIMITS.MINER_MINERAL_MAX && _.sum(rc.room.terminal.store) < CONSTANTS.RESOURCES.TERMINAL_MAX_STORE;
    },
  },

  miner_commodity: {
    produceGlobal: false,
    priority: 6,
    levelMin: 5,
    minParts: 16,
    wait4maxEnergy: true,
    body2: generateBody([MOVE, WORK, MOVE, CARRY], 12), // 24 MOVE, 12 WORK, 12 CARRY
    behaviors: ["goto_flag:green", "miner_harvest_commodities", "goto_home", "transfer_storage"],

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
    behaviors: ["goto_flag:yellow", "miner_raid_room", "goto_home", "transfer_storage"],

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
    behaviors: ["renew:emergency", "get_resources", "transfer_resources", "renew"],

    canBuild: function (rc) {
      const transporters = rc.getAllCreeps("transporter");
      const droppedAmount = rc.getDroppedResourcesAmount();
      let modifier = 0;
      if (droppedAmount > CONSTANTS.RESOURCES.DROPPED_MIN * 50) { // 50x the minimum
        Log.warn(`High amount of Dropped resources in ${rc.room}. Amount: ${droppedAmount}. Build additional transporter.`, "transporter");
        Game.notify(`High amount of Dropped resources in ${rc.room}. Amount: ${droppedAmount}. Build additional transporter.`);
        modifier = 1;
      }
      const level = rc.getLevel();
      if (level < 4) {
        return transporters.length < CONSTANTS.CREEP_LIMITS.TRANSPORTER_BASE + modifier;
      } else if (level < 7) {
        return transporters.length < CONSTANTS.CREEP_LIMITS.TRANSPORTER_MID + modifier;
      } else {
        return transporters.length < CONSTANTS.CREEP_LIMITS.TRANSPORTER_HIGH;
      }
    },
  },

  upgrader: {
    priority: 4,
    levelMin: 1,
    minParts: 3,
    wait4maxEnergy: true,
    
    // Dynamischer Body basierend auf RCL
    // RCL 8: Max 15 Energy/tick Limit, daher kleinerer Body
    // RCL 1-7: Größerer Body für schnelleres Upgraden
    getBody: function (rc) {
      const level = rc.getLevel();
      if (level === 8) {
        // RCL 8: Optimiert für 15 Energy/tick Limit (15 WORK Parts)
        return [
          MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY,
          MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, CARRY,
          MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK,
          MOVE, WORK, MOVE, WORK, CARRY, WORK, MOVE, WORK,
          MOVE, WORK, MOVE, WORK,
        ];
      } else {
        // RCL 1-7: Maximaler Body für schnelles Upgraden
        return [
          MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK,
          MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE, WORK,
          MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK,
          MOVE, WORK, CARRY, WORK, MOVE, WORK, MOVE, WORK,
          MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK,
          MOVE, WORK, MOVE, WORK, MOVE, WORK,
        ];
      }
    },
    
    // Fallback body2 für Kompatibilität (wird verwendet wenn getBody nicht aufgerufen wird)
    body2: [
      MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK,
      MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE, WORK,
      MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK,
      MOVE, WORK, CARRY, WORK, MOVE, WORK, MOVE, WORK,
      MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK,
      MOVE, WORK, MOVE, WORK, MOVE, WORK,
    ],
    
    behaviors: ["find_near_energy", "upgrade_controller"],

    canBuild: function (rc) {
      var controller = rc.room.controller;
      if (!controller || !controller.my) return false;
      
      const level = rc.getLevel();
      const upgraders = rc.getAllCreeps("upgrader");

      // Hilfsfunktion: Energie in der Nähe des Controllers
      function energyAround(obj) {
        var dropped = obj.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
          filter: { resourceType: RESOURCE_ENERGY }
        });
        let amount = 0;
        for (var d in dropped) {
          amount += dropped[d].amount;
        }
        return amount;
      }

      // RCL 8: Nur 1 Upgrader (wegen 15 Energy/tick Limit)
      if (level === 8) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_RCL8;
      }
      
      // RCL 1-4: Mehr Upgrader für schnellen Fortschritt
      if (level <= 4) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_LOW;
      }
      
      // RCL 5: Mittlere Anzahl
      if (level === 5) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_MID;
      }
      
      // RCL 6-7: Dynamisch basierend auf verfügbarer Energie
      if (energyAround(controller) > CONSTANTS.STRUCTURE_ENERGY.CONTROLLER_ENERGY_HIGH) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_MID;
      } else {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_HIGH;
      }
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
    behaviors: ["renew:emergency", "build_structures", "repair"],

    canBuild: function (rc) {
      var towers = rc.room.towers;

      var structures = _.filter(rc.find(FIND_STRUCTURES), function (s) {
        return s.needsRepair();
      });
      if (rc.getLevel() < 4) {
        return (rc.find(FIND_CONSTRUCTION_SITES).length > 0 || (towers.length < 1 && structures.length > 0)) && rc.getAllCreeps("constructor").length < CONSTANTS.CREEP_LIMITS.CONSTRUCTOR_LOW;
      } else {
        return (rc.find(FIND_CONSTRUCTION_SITES).length > 0 || (towers.length < 1 && structures.length > 0)) && rc.getAllCreeps("constructor").length < CONSTANTS.CREEP_LIMITS.CONSTRUCTOR_HIGH;
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
    behaviors: ["goto_flag:red", "attack_enemy"],

    canBuild: function (rc) {
      const flags = _.filter(Game.flags, { color: COLOR_RED });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role === "attacker").length < CONSTANTS.CREEP_LIMITS.ATTACKER_MAX;
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
    behaviors: ["goto_flag:white", "clear_enemy_buildings", "get_resources", "harvest", "build_structures", "transfer_resources", "upgrade_controller"],

    canBuild: function (rc) {
      const flags = _.filter(Game.flags, { color: COLOR_WHITE });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role === "supporter").length < CONSTANTS.CREEP_LIMITS.SUPPORTER_MAX;
    },
  },

  claimer: {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,
    minParts: 4,
    wait4maxEnergy: true,
    body2: generateBody([MOVE, CLAIM], 2), // 2 MOVE, 2 CLAIM
    behaviors: ["goto_flag:white", "claim_controller", "place_spawn"],

    canBuild: function (rc) {
      const flags = _.filter(Game.flags, { color: COLOR_WHITE });
      if (flags.length === 0) return false;
      if (flags[0].room && flags[0].room.controller && flags[0].room.controller.my) return false;
      return _.filter(Game.creeps, (c) => c.memory.role === "claimer").length < CONSTANTS.CREEP_LIMITS.CLAIMER_MAX;
    },
  },
};
