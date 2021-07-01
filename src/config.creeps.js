module.exports = {

  "builder": {
    priority: 1,
    minParts: 4,
    wait4maxEnergy: false,
    body2: [MOVE, WORK, CARRY, MOVE],
    behaviors: ["get_resources", "harvest", "transfer_resources", "build_structures", "upgrade_controller"],

    canBuild: function (rc) {
      if (rc.getLevel() > 2) {
        return rc.getAllCreeps().length === 0;
      } else {
        return (rc.getAllCreeps("builder").length + rc.getAllCreeps("supporter").length) < 5;
      }
    }
  },

  "miner": {
    // TODO miner - if idle - repair container
    // TODO miner - if link empty + container filled -> transfer to link.
    // TODO miner - create moving miner
    priority: 2,
    levelMin: 2,
    minParts: 3,
    wait4maxEnergy: false,
    body2: [MOVE, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, MOVE],
    behaviors: ["miner_harvest"],

    canBuild: function (rc) {
      var miners = rc.getAllCreeps("miner");
      var sources = rc.getSources();
      return (miners.length < sources.length);
    }
  },

  "miner_mineral": {
    priority: 5,
    levelMin: 6,
    minParts: 16,
    wait4maxEnergy: true,
    body2: [MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK],
    behaviors: ["miner_harvest_mineral"],

    canBuild: function (rc) {
      var miners = rc.getAllCreeps("miner_mineral");
      return (rc.room.extractor && rc.room.terminal && rc.getMineralAmount() > 0 && miners < 1 && _.sum(rc.room.terminal.store) < 270000);
    }
  },

  "transporter": {
    priority: 3,
    levelMin: 2,
    minParts: 6,
    wait4maxEnergy: false,
    body2: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
    behaviors: ["renew", "get_resources", "transfer_resources"],

    canBuild: function (rc) {
      var transporters = rc.getAllCreeps('transporter');
      let modifier = 0;
      if (rc.getDroppedResourcesAmount() > 5000) {
        modifier = 2;
      } else if (rc.getDroppedResourcesAmount() > 2000) {
        modifier = 1;
      }
      if (rc.getLevel() < 4) {
        return (transporters.length < (4 + modifier));
      } else {
        return (transporters.length < (2 + modifier));
      }
    }
  },

  "upgrader": {
    priority: 4,
    levelMin: 1,
    levelMax: 7,
    minParts: 3,
    wait4maxEnergy: true,
    body2: [MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, CARRY, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK],
    behaviors: ["goto_controller", "find_near_energy", "upgrade_controller"],

    canBuild: function (rc) {

      var controller = rc.room.controller;

      function energyAround(obj) {
        var dropped = obj.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
          resourceType: RESOURCE_ENERGY
        });
        let amount = 0
        for (var d in dropped) {
          amount += dropped[d].amount;
        }
        return amount;
      }
      // Low Level
      if (rc.getLevel() <= 4) {
        return controller.my && rc.getAllCreeps('upgrader').length < 4
      }
      if (rc.getLevel() == 5) {
        return controller.my && rc.getAllCreeps('upgrader').length < 2
      }
      // High Level
      if (energyAround(controller) > 2000) {
        return (controller && controller.my && rc.getAllCreeps('upgrader').length < 2);
      } else {
        return (controller && controller.my && rc.getAllCreeps('upgrader').length < 1);
      }
    }
  },

  "upgrader8": {
    priority: 4,
    levelMin: 8,
    minParts: 36,
    wait4maxEnergy: true,
    // Max 15 Energy per tick in RCL 8 needed
    body2: [MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, CARRY, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK],
    behaviors: ["goto_controller", "find_near_energy", "upgrade_controller"],

    canBuild: function (rc) {
      var controller = rc.room.controller;
      return (controller.my && rc.getAllCreeps('upgrader8').length < 1);
    }
  },

  "constructor": {
    priority: 5,
    levelMin: 2,
    minParts: 4,
    wait4maxEnergy: true,
    body2: [MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK],
    // behaviors: ["get_energy_dropped", "get_energy_container", "get_energy_link", "get_energy_storage", "get_energy_terminal", "harvest", "build_structures", "repair", "find_near_energy", "upgrade_controller"],
    behaviors: ["renew", "build_structures", "repair"],

    canBuild: function (rc) {
      var towers = rc.room.towers;

      var structures = _.filter(rc.find(FIND_STRUCTURES), function (s) {
        return s.needsRepair();
      });

      if (rc.getLevel() < 4) {
        return (((rc.find(FIND_CONSTRUCTION_SITES).length > 0) || (towers.length < 1 && structures.length > 0)) && rc.getAllCreeps("constructor").length < 2);
      } else {
        return (((rc.find(FIND_CONSTRUCTION_SITES).length > 0) || (towers.length < 1 && structures.length > 0)) && rc.getAllCreeps("constructor").length < 1);
      }
    }
  },

  'attacker': {
    produceGlobal: false,
    priority: 3,
    minLevel: 4,
    minParts: 6,
    wait4maxEnergy: true,
    body2: [MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK],
    behaviors: ['goto_red_flag', 'attack_enemy'],

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, {
        'color': COLOR_RED
      });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'attacker').length < 1;
    }
  },

  // TODO Supporter help rooms with RCL <= 3
  'supporter': {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,
    minParts: 8,
    wait4maxEnergy: true,
    body2: [MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK],
    behaviors: ['goto_white_flag', "clear_enemy_buildings", "get_resources", "harvest", "build_structures", "transfer_resources", "upgrade_controller"],

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, {
        'color': COLOR_WHITE
      });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'supporter').length < 3;
    }
  },

  'claimer': {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,
    minParts: 4,
    wait4maxEnergy: true,
    body2: [MOVE, CLAIM, MOVE, CLAIM],
    behaviors: ["goto_white_flag", "claim_controller", "place_spawn"],

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, {
        'color': COLOR_WHITE
      });
      if (flags.length === 0 || (flags[0].room && flags[0].room.controller.my)) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'claimer').length < 1;
    }
  },
};