/**
 * Generate a body array by repeating a pattern
 * @param {Array} pattern - Array of body parts to repeat (e.g., [MOVE, WORK])
 * @param {number} count - Number of times to repeat the pattern
 * @returns {Array} - Generated body array
 */
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");
const scoutBehavior = require("./behavior.scout");
const cpuAnalyzer = require("./service.cpu");

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
    body: [MOVE, WORK, CARRY, MOVE],
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
    body: [MOVE, WORK, WORK, WORK, WORK, WORK, CARRY, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, MOVE],
    behaviors: ["miner_harvest"],

    canBuild: function (rc) {
      const miners = rc.getAllCreeps("miner");
      // Nutzt gecachten find() Cache statt getSources()
      const sources = rc.find(FIND_SOURCES);
      // Count how many sources already have a miner assigned
      let assignedSources = 0;
      for (const source of sources) {
        if (rc.getCreeps("miner", source.id).length > 0) {
          assignedSources++;
        }
      }
      // Only spawn if there are sources without miners
      return assignedSources < sources.length;
    },
  },
  // LONGTERM miner - create moving miner

  miner_mineral: {
    priority: 5,
    levelMin: 6,
    minParts: 16,
    wait4maxEnergy: true,
    body: generateBody([MOVE, WORK], 25), // 25 MOVE, 25 WORK
    behaviors: ["miner_harvest_mineral", "recycle"],

    canBuild: function (rc) {
      const miners = rc.getAllCreeps("miner_mineral");
      return rc.room.extractor && rc.room.terminal && rc.getMineralAmount() > 0 && miners.length < CONSTANTS.CREEP_LIMITS.MINER_MINERAL_MAX && _.sum(rc.room.terminal.store) < CONSTANTS.RESOURCES.TERMINAL_MAX_STORE;
    },
  },

  miner_commodity: {
    produceGlobal: false,
    priority: 6,
    levelMin: 5,
    minParts: 16,
    wait4maxEnergy: true,
    body: generateBody([MOVE, WORK, MOVE, CARRY], 12), // 24 MOVE, 12 WORK, 12 CARRY
    behaviors: ["goto_flag:green", "miner_harvest_commodities", "goto_home", "transfer_storage"],

    canBuild: function (rc) {
      const miners = _.filter(Game.creeps, (c) => c.memory.role === "miner_commodity").length;
      return _.find(Game.flags, { color: COLOR_GREEN }) && miners < 1;
    },
  },

  miner_raid: {
    produceGlobal: false,
    priority: 6,
    levelMin: 5,
    minParts: 16,
    wait4maxEnergy: true,
    body: generateBody([MOVE, WORK], 25), // 25 MOVE, 25 WORK
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
    body: generateBody([MOVE, CARRY], 16), // 16 MOVE, 16 CARRY
    behaviors: ["renew:emergency", "get_resources", "transfer_resources", "renew"],

    canBuild: function (rc) {
      const transporters = rc.getAllCreeps("transporter");
      const droppedAmount = rc.getDroppedResourcesAmount();
      let modifier = 0;
      const level = rc.getLevel();
      let limit;

      if (level < 4) {
        limit = CONSTANTS.CREEP_LIMITS.TRANSPORTER_BASE;
      } else if (level < 7) {
        limit = CONSTANTS.CREEP_LIMITS.TRANSPORTER_MID;
      } else {
        limit = CONSTANTS.CREEP_LIMITS.TRANSPORTER_HIGH;
      }

      if (droppedAmount > CONSTANTS.RESOURCES.DROPPED_MIN * 50) { // 50x the minimum
        modifier = 1;
        // Only warn if we can actually build an additional transporter
        if (transporters.length < limit + modifier) {
          Log.warn(`High amount of Dropped resources in ${rc.room}. Amount: ${droppedAmount}. Build additional transporter.`, "transporter");
        }
      }

      return transporters.length < limit + modifier;
    },
  },

  ornithopter: {
    priority: 3,
    levelMin: 2,
    minParts: 6,
    wait4maxEnergy: false,
    body: generateBody([MOVE, CARRY], 16), // 16 MOVE, 16 CARRY
    behaviors: ["renew:emergency", "transport", "renew"],

    canBuild: function (rc) {
      // Only manual creation for test phase
      return false;
    },
  },

  upgrader: {
    priority: 4,
    levelMin: 1,
    minParts: 3,
    wait4maxEnergy: true,

    // Dynamischer Body basierend auf RCL
    // RCL 8: Max 15 Energy/tick Limit, daher kleinerer Body
    // RCL 1-7: Larger body for faster upgrading
    getUpgraderBody: function (rc) {
      const level = rc.getLevel();
      if (level === 8) {
        // RCL 8: Optimized for 15 Energy/tick limit (15 WORK parts)
        return [
          MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY,
          MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, CARRY,
          MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK,
          MOVE, WORK, MOVE, WORK, CARRY, WORK, MOVE, WORK,
          MOVE, WORK, MOVE, WORK,
        ];
      } else {
        // RCL 1-7: Maximum body for fast upgrading
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

    behaviors: ["find_near_energy", "upgrade_controller"],

    canBuild: function (rc) {
      const {controller} = rc.room;
      if (!controller || !controller.my) return false;

      const level = rc.getLevel();
      const upgraders = rc.getAllCreeps("upgrader");

      // Helper function: Energy near the controller
      function energyAround(obj) {
        const dropped = obj.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
          filter: { resourceType: RESOURCE_ENERGY },
        });
        let amount = 0;
        for (const d in dropped) {
          amount += dropped[d].amount;
        }
        return amount;
      }

      // RCL 8: Nur 1 Upgrader (wegen 15 Energy/tick Limit)
      if (level === 8) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_RCL8;
      }

      // RCL 1-4: More upgraders for fast progress
      if (level <= 4) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_LOW;
      }

      // RCL 5: Mittlere Anzahl
      if (level === 5) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_MID;
      }

      // RCL 6-7: Dynamic based on available energy
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
    body: [
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
      const {towers} = rc.room;

      const structures = _.filter(rc.find(FIND_STRUCTURES), (s) => {
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
    body: generateBody([MOVE, ATTACK], 25), // 25 MOVE, 25 ATTACK
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
    body: generateBody([MOVE, RANGED_ATTACK], 25), // 25 MOVE, 25 RANGED_ATTACK
    behaviors: ["attack_enemy"],

    canBuild: function (rc) {
      // Only build if no tower OR boosted creeps enter room
      const hasTowers = rc.room.towers && rc.room.towers.length > 0;

      // Check for boosted hostile creeps
      const hostiles = rc.getEnemys();
      const hasBoostedCreeps = hostiles.some(creep => {
        // Check if creep has any boosted body parts
        return creep.body.some(part => part.boost);
      });

      // Build defender if: no towers OR boosted creeps present
      return !hasTowers || hasBoostedCreeps;
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
    body: [...generateBody([MOVE, CARRY, MOVE, WORK], 12), MOVE, WORK],
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
    body: generateBody([MOVE, CLAIM], 2), // 2 MOVE, 2 CLAIM
    behaviors: ["goto_flag:white", "claim_controller", "place_spawn"],

    canBuild: function (rc) {
      const flags = _.filter(Game.flags, { color: COLOR_WHITE });
      if (flags.length === 0) return false;
      if (flags[0].room && flags[0].room.controller && flags[0].room.controller.my) return false;
      if (_.filter(Game.creeps, (c) => c.memory.role === "claimer").length >= CONSTANTS.CREEP_LIMITS.CLAIMER_MAX) return false;

      // Check CPU analysis (only check periodically to save CPU)
      if (Game.time % CONSTANTS.CPU_ANALYSIS.CHECK_INTERVAL === 0) {
        const decision = cpuAnalyzer.canConquerNewRoom();
        if (!decision.canConquer) {
          return false;
        }
      }

      return true;
    },
  },

  scout: {
    priority: 7,
    levelMin: 1,
    minParts: 1,
    wait4maxEnergy: false,
    body: [MOVE], // Nur 1 MOVE part
    behaviors: ["scout", "sign_controller", "recycle"],

    canBuild: function (rc) {
      // Don't spawn scouts if room has an Observer
      const observers = rc.room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_OBSERVER,
      });
      if (observers.length > 0) {
        return false;
      }

      // Maximal 1 Scout pro HomeRoom - check if scout with this homeRoom already exists
      const homeRoom = rc.room.name;
      const existingScouts = _.filter(Game.creeps, (c) => {
        return c.memory.role === "scout" && c.memory.home === homeRoom;
      });
      if (existingScouts.length >= 1) {
        return false;
      }

      // Prüfe ob überhaupt ein Raum besucht werden muss
      // Erstelle ein Mock-Creep-Objekt für findUnvisitedRoom
      const mockCreep = {
        room: rc.room,
        memory: { home: homeRoom },
      };
      const unvisitedRoom = scoutBehavior.findUnvisitedRoom(mockCreep);
      return unvisitedRoom !== null;
    },
  },
};
