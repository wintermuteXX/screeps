module.exports = {

  "builder": {
    priority: 1,
    minParts: 4,
    wait4maxEnergy: false,
    body2: [MOVE, WORK, CARRY, MOVE],
    behaviors: ["get_energy_dropped", "get_energy_link", "get_energy_storage", "harvest", "transfer_energy_spawn", "transfer_energy_extensions", "build_structures", "upgrade_controller"],

    canBuild: function (rc) {
      if (rc.getLevel() > 2) {
        return rc.getCreeps().length === 0;
      } else {
        return rc.getCreeps("builder").length < 5;
      }
    }
  },

  "miner": {
    priority: 2,
    levelMin: 2,
    minParts: 3,
    wait4maxEnergy: false,
    body2: [MOVE, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, MOVE],
    behaviors: ["miner_harvest"],

    canBuild: function (rc) {
      var miners = rc.getCreeps("miner");
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
      var miners = rc.getCreeps("miner_mineral");
      var extractor = _.filter(rc.find(FIND_MY_STRUCTURES), function (s) {
        return (s.structureType === STRUCTURE_EXTRACTOR);
      });

      return (extractor.length && rc.getMineralAmount() > 0 && miners < 1);
    }
  },

  "transporter": {
    priority: 3,
    levelMin: 2,
    minParts: 6,
    wait4maxEnergy: false,
    renew: true,
    body2: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
    behaviors: ["renew", "get_energy_link", "get_energy_dropped", "get_energy_container", "get_energy_storage", "get_energy_terminal", "transfer_energy_extensions", "transfer_energy_spawn", "transfer_energy_tower", "transfer_energy_upgrader", "transfer_energy_storage"],

    canBuild: function (rc) {
      // var miners = rc.getCreeps('miner');

      // Disabled, now use transporter2
      return false;
      var transporters = rc.getCreeps('transporter');
      // var links = _.filter(rc.find(FIND_MY_STRUCTURES), function (s) { return (s.structureType === STRUCTURE_LINK); });
      // Generell doppelt so viele Transporter wie Miner. Zahl verringert sich mit Links. Formel ist noch nicht 100% korrekt. 
      // return ((transporters.length + links.length) - 1 < miners.length * 2 || transporters.length < 1);
      // return false;
      return transporters.length < 1;
    }
  },

  "transporter2": {
    priority: 3,
    levelMin: 2,
    minParts: 6,
    wait4maxEnergy: false,
    body2: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
    behaviors: ["get_resources", "transfer_resources", "transfer_energy_storage"],

    canBuild: function (rc) {
      var transporters = rc.getCreeps('transporter2');

      if (rc.getLevel() < 5) {
        return (transporters.length < 4)
      } else {
        return (transporters.length < 2);
      }
    }
  },

  "upgrader": {
    priority: 4,
    levelMin: 2,
    levelMax: 7,
    minParts: 3,
    wait4maxEnergy: true,
    body2: [MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, CARRY, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK],
    behaviors: ["goto_controller", "find_near_energy", "upgrade_controller"],

    canBuild: function (rc) {

      var controller = rc.getController();

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
      if (rc.getLevel() < 4) {
        return controller && controller.my && rc.getCreeps('upgrader').length < 4
      }
      if (rc.getLevel() == 4) {
        return controller && controller.my && rc.getCreeps('upgrader').length < 3
      }
      // High Level
      if (energyAround(controller) > 2000) {
        return (controller && controller.my && rc.getCreeps('upgrader').length < 2);
      } else {
        return (controller && controller.my && rc.getCreeps('upgrader').length < 1);
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
      var controller = rc.getController();
      return (controller && controller.my && rc.getCreeps('upgrader8').length < 1);
    }
  },

  "constructor": {
    priority: 5,
    levelMin: 2,
    minParts: 4,
    wait4maxEnergy: true,
    body2: [MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK],
    // behaviors: ["get_energy_dropped", "get_energy_container", "get_energy_link", "get_energy_storage", "get_energy_terminal", "harvest", "build_structures", "repair", "find_near_energy", "upgrade_controller"],
    behaviors: ["build_structures", "repair"],

    canBuild: function (rc) {
      var towers = rc.find(FIND_MY_STRUCTURES, {
        filter: {
          structureType: STRUCTURE_TOWER
        }
      });

      var structures = _.filter(rc.find(FIND_STRUCTURES), function (s) {
        return s.needsRepair();
      });
      // return rc.getCreeps("constructor").length < 2;

      return (((rc.find(FIND_CONSTRUCTION_SITES).length > 0) || (towers.length < 1 && structures.length > 0)) && rc.getCreeps("constructor").length < 2);
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

  //TODO: Redefine Scout to support unit who supports rooms with RCL <= 3. Build in the nearest poosible Spawn.
  'scout': {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,
    minParts: 8,
    wait4maxEnergy: true,
    body2: [MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK],
    behaviors: ['goto_white_flag', "get_energy_dropped", "harvest", "transfer_energy_spawn", "transfer_energy_extensions", "build_structures", "upgrade_controller"],

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, {
        'color': COLOR_WHITE
      });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'scout').length < 3;
    }
  },

  //TODO Let claimer also bild Spawn after Controller is claimed. Also: Remove White Flag
  'claimer': {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,
    minParts: 4,
    wait4maxEnergy: true,
    body2: [MOVE, CLAIM, MOVE, CLAIM],
    behaviors: ['goto_white_flag', "claim_controller"],

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, {
        'color': COLOR_WHITE
      });
      if (flags.length === 0 || (flags[0].room && flags[0].room.controller.my)) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'claimer').length < 1;
    }
  },
};