/**
 * Generate a body array by repeating a pattern
 * @param {Array} pattern - Array of body parts to repeat (e.g., [MOVE, WORK])
 * @param {number} count - Number of times to repeat the pattern
 * @returns {Array} - Generated body array
 */
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

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
    namePrefix: "Construction_Crawler",
    body: [MOVE, WORK, CARRY, MOVE],
    behaviors: ["transport", "harvest", "build_structures", "upgrade_controller"],

    canBuild: function (rc) {
      if (rc.getLevel() > 2) {
        return rc.getAllCreeps().length === 0;
      } else {
        return rc.getAllCreeps("builder").length + CONSTANTS.CREEP_LIMITS.SUPPORTER_MAX < CONSTANTS.CREEP_LIMITS.BUILDER_MAX_LOW_LEVEL;
      }
    },
  },

  miner: {
    priority: 2,
    levelMin: 2,
    minParts: 3,
    wait4maxEnergy: false,
    namePrefix: "Spice_Harvester",
    body: [MOVE, WORK, WORK, WORK, WORK, WORK, CARRY, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, MOVE],
    behaviors: ["miner_harvest"],

    canBuild: function (rc) {
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
  // Long-term miner - create moving miner

  miner_mineral: {
    priority: 5,
    levelMin: 6,
    minParts: 16,
    wait4maxEnergy: true,
    namePrefix: "Mineral_Extractor",
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
    namePrefix: "Commodity_Harvester",
    body: generateBody([MOVE, WORK, MOVE, CARRY], 12), // 24 MOVE, 12 WORK, 12 CARRY
    behaviors: ["goto_flag:green", "miner_harvest_commodities", "goto_home", "transfer_storage"],

    canBuild: function (rc) {
      const miners = _.filter(Game.creeps, (c) => c.memory.role === "miner_commodity").length;
      return _.find(Game.flags, { color: COLOR_GREEN }) && miners < 1;
    },
  },

  transporter: {
    priority: 3,
    levelMin: 2,
    minParts: 6,
    wait4maxEnergy: false,
    namePrefix: "Ornithopter",
    body: generateBody([MOVE, CARRY], 16), // 16 MOVE, 16 CARRY
    behaviors: ["renew:emergency", "transport", "renew"],

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

      if (droppedAmount > CONSTANTS.RESOURCES.DROPPED_MIN * CONSTANTS.RESOURCES.DROPPED_MULTIPLIER) {
        modifier = 1;
        // Only warn if we can actually build an additional transporter
        if (transporters.length < limit + modifier) {
          Log.warn(`High amount of Dropped resources in ${rc.room}. Amount: ${droppedAmount}. Build additional transporter.`, "transporter");
        }
      }

      return transporters.length < limit + modifier;
    },
  },

  upgrader: {
    priority: 4,
    levelMin: 1,
    minParts: 3,
    wait4maxEnergy: true,
    namePrefix: "Spice_Refiner",

    // Dynamic body based on RCL
    // RCL 8: Max energy per tick limit (CONSTANTS.CREEP_ENERGY.RCL8_MAX_PER_TICK), so smaller body
    // RCL 1-7: Larger body for faster upgrading
    getUpgraderBody: function (rc) {
      const level = rc.getLevel();
      if (level === 8) {
        // RCL 8: Optimized for RCL8_MAX_PER_TICK energy/tick limit (15 WORK parts)
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

      // RCL 8: Only 1 upgrader (15 energy/tick limit)
      if (level === 8) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_RCL8;
      }

      // RCL 1-4: More upgraders for fast progress
      if (level <= 4) {
        return upgraders.length < CONSTANTS.CREEP_LIMITS.UPGRADER_LOW;
      }

      // RCL 5: Medium amount
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
    namePrefix: "Repair_Crawler",
    body: generateBody([MOVE, CARRY, MOVE, WORK], 8),
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
    levelMin: 4,
    minParts: 6,
    wait4maxEnergy: true,
    namePrefix: "Sardaukar",
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
    levelMin: 2,
    minParts: 6,
    wait4maxEnergy: true,
    namePrefix: "Shield_Wall",
    body: generateBody([MOVE, RANGED_ATTACK], 25), // 25 MOVE, 25 RANGED_ATTACK
    behaviors: ["attack_enemy"],

    canBuild: function (rc) {
      // Check global defender limit first
      const existingDefenders = _.filter(Game.creeps, (c) => c.memory.role === "defender").length;
      if (existingDefenders >= CONSTANTS.CREEP_LIMITS.DEFENDER_MAX) {
        return false;
      }

      // Only build if no tower AND hostiles present OR boosted creeps enter room
      const hasTowers = rc.room.towers && rc.room.towers.length > 0;
    
      // Check for hostile creeps
      const hostiles = rc.getEnemies();
      const hasHostiles = hostiles.length > 0;
      
      // Check for boosted hostile creeps
      const hasBoostedCreeps = hostiles.some(creep => {
        // Check if creep has any boosted body parts
        return creep.body.some(part => part.boost);
      });
    
      // Build defender if: (no towers AND hostiles present) OR boosted creeps present
      return (!hasTowers && hasHostiles) || hasBoostedCreeps;
    },
  },

  supporter: {
    produceGlobal: false,
    priority: 6,
    levelMin: 3,
    minParts: 8,
    wait4maxEnergy: true,
    namePrefix: "Support_Crawler",
    // 12x [MOVE, CARRY, MOVE, WORK] + [MOVE, WORK] = 25 MOVE, 12 CARRY, 13 WORK
    body: [...generateBody([MOVE, CARRY, MOVE, WORK], 12), MOVE, WORK],
    behaviors: ["goto_target_room", "clear_enemy_buildings", "transport", "harvest", "build_structures", "upgrade_controller"],
    canBuild: function (rc) {
      // Check if enough supporters already exist
      const existingSupporters = _.filter(Game.creeps, (c) => c.memory.role === "supporter");
      if (existingSupporters.length >= CONSTANTS.CREEP_LIMITS.SUPPORTER_MAX) {
        return false;
      }

      // Check if roomToClaim is set
      if (!Memory.roomToClaim || !Memory.rooms || !Memory.rooms[Memory.roomToClaim]) {
        return false;
      }

      const targetRoomName = Memory.roomToClaim;
      const roomMemory = Memory.rooms[targetRoomName];
      const gameRoom = Game.rooms[targetRoomName];

      // Check if room is claimed
      if (!Room.isRoomClaimed(targetRoomName)) {
        return false;
      }

      // Update memory when Game.rooms has newer data
      if (gameRoom && gameRoom.controller && gameRoom.controller.my) {
        // Use new unified structure: structures.controllers[controllerId]
        if (!roomMemory.structures) roomMemory.structures = {};
        if (!roomMemory.structures.controllers) roomMemory.structures.controllers = {};
        const controllerId = gameRoom.controller.id;
        if (!roomMemory.structures.controllers[controllerId]) {
          roomMemory.structures.controllers[controllerId] = {};
        }
        roomMemory.structures.controllers[controllerId].my = true;
        roomMemory.structures.controllers[controllerId].level = gameRoom.controller.level;
      }

      // Check if room is still below RCL 3
      // Use new structure
      let controllerLevel = null;
      if (roomMemory.structures && roomMemory.structures.controllers) {
        const controllerIds = Object.keys(roomMemory.structures.controllers);
        if (controllerIds.length > 0) {
          controllerLevel = roomMemory.structures.controllers[controllerIds[0]].level;
        }
      }
      if (!controllerLevel && gameRoom && gameRoom.controller) {
        controllerLevel = gameRoom.controller.level;
      }
      if (!controllerLevel || controllerLevel >= 3) {
        return false;
      }

      // Count supporters already assigned to or in this room
      const supportersForRoom = existingSupporters.filter(s => 
        s.memory.targetRoom === targetRoomName || (s.room && s.room.name === targetRoomName)
      );

      // Max 2 supporters per room
      return supportersForRoom.length < 2;
    },
  },

  claimer: {
    produceGlobal: false,
    priority: 6,
    levelMin: 3,
    minParts: 4,
    wait4maxEnergy: true,
    namePrefix: "Colonizer",
    body: generateBody([MOVE, CLAIM], 2), // 2 MOVE, 2 CLAIM
    behaviors: ["claim_controller"],

    canBuild: function (rc) {
      // Temporary: disable claimer spawning
      return false;
      // Check if a claimer already exists
      const existingClaimers = _.filter(Game.creeps, (c) => c.memory.role === "claimer");
      if (existingClaimers.length >= CONSTANTS.CREEP_LIMITS.CLAIMER_MAX) {
        return false;
      }

      // If roomToClaim is set, check if spawning is allowed
      if (Memory.roomToClaim) {
        if (Room.hasClaimerForRoom(Memory.roomToClaim, existingClaimers)) {
          return false;
        }
        return Room.isRoomValidForClaiming(Memory.roomToClaim);
      }
      return false;
    },
  },

  scout: {
    priority: 7,
    levelMin: 1,
    minParts: 1,
    wait4maxEnergy: false,
    namePrefix: "Explorer",
    body: [MOVE], // Only 1 MOVE part
    behaviors: ["scout", "sign_controller", "recycle"],

    canBuild: function (rc) {
      // Don't spawn scouts if room has an Observer
      // Use cached find() and filter manually (rc.find() doesn't support filter parameter)
      const observers = rc.find(FIND_MY_STRUCTURES).filter(s => 
        s.structureType === STRUCTURE_OBSERVER
      );
      if (observers.length > 0) {
        return false;
      }

      // Max 1 scout per home room - check if scout already exists
      const homeRoom = rc.room.name;
      const existingScouts = _.filter(Game.creeps, (c) => {
        return c.memory.role === "scout" && c.memory.home === homeRoom;
      });
      if (existingScouts.length >= 1) {
        return false;
      }

      // Check if a room still needs scouting
      // Create a mock creep object for findUnvisitedRoom
      const mockCreep = {
        room: rc.room,
        memory: { home: homeRoom },
        findUnvisitedRoom: Creep.prototype.findUnvisitedRoom,
      };
      const unvisitedRoom = mockCreep.findUnvisitedRoom();
      return unvisitedRoom !== null;
    },
  },
};
