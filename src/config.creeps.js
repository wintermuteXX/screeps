module.exports = {

  "builder": {
    priority: 1,

    canBuild: function (rc) {
      if (rc.getLevel() > 2) {
        return rc.getCreeps().length === 0;
      } else {
        return rc.getCreeps("builder").length < 5;
      }
    },

    body2: [MOVE, WORK, CARRY, MOVE],
    behaviors: ["get_energy_dropped", "get_energy_link", "get_energy_storage", "harvest", "transfer_energy_spawn", "transfer_energy_extensions", "build_structures", "upgrade_controller"]

  },

  "miner": {
    priority: 2,
    levelMin: 2,

    canBuild: function (rc) {
      var miners = rc.getCreeps("miner");
      var sources = rc.getSources();

      return (miners.length < sources.length);
    },

    body2: [MOVE, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, MOVE],
    behaviors: ["miner_harvest"]
  },

  "miner_mineral": {
    priority: 5,
    levelMin: 6,

    canBuild: function (rc) {
      var miners = rc.getCreeps("miner_mineral");
      var extractor = _.filter(rc.find(FIND_MY_STRUCTURES), function (s) {
        return (s.structureType === STRUCTURE_EXTRACTOR);
      });

      return (extractor.length && rc.getMineralAmount() > 0 && miners < 1);
    },

    body2: [MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK],
    behaviors: ["miner_harvest_mineral"]
  },

  "transporter": {
    priority: 1,
    levelMin: 2,

    canBuild: function (rc) {
      var miners = rc.getCreeps('miner');
      var transpoters = rc.getCreeps('transporter');
      var links = _.filter(rc.find(FIND_MY_STRUCTURES), function (s) {
        return (s.structureType === STRUCTURE_LINK);
      });
      // Generell doppelt so viele Transporter wie Miner. Zahl verringert sich mit Links. Formel ist noch nicht 100% korrekt. 
      return ((transpoters.length + links.length) - 1 < miners.length * 2);

    },

    body2: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
    behaviors: ["get_energy_link", "get_energy_dropped", "get_energy_container", "get_energy_storage", "transfer_energy_extensions", "transfer_energy_spawn", "transfer_energy_tower", "transfer_energy_storage", "transfer_energy_upgrader"]
  },


  "transporter2": {
    priority: 1,
    levelMin: 2,

    canBuild: function (rc) {
      var transpoters = rc.getCreeps('transporter2');
      return false;
      // return (transpoters.length < 1);
    },

    body2: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
    behaviors: ["get_resources", "transfer_energy_extensions", "transfer_energy_spawn", "transfer_energy_tower", "transfer_energy_storage", "transfer_energy_upgrader"]
  },

  "transporter_mineral": {
    priority: 5,
    levelMin: 3,

    canBuild: function (rc) {
      var transporters = rc.getCreeps('transporter_mineral');
      var container = rc.getMineralContainer();
      if (container) {
        return (_.sum(container.store) > 500 && transporters.length < 1);
      } else {
        return false;
      }
    },

    body2: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
    behaviors: ["get_minerals_container", "transfer_mineral_storage"]
  },

  "upgrader": {
    priority: 4,
    levelMin: 2,

    canBuild: function (rc) {
      var controller = rc.getController();
      return (controller && controller.my && rc.getCreeps('upgrader').length < 1);
    },

    body2: [MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, CARRY, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK],
    behaviors: ["goto_controller", "find_near_energy", "upgrade_controller"]
  },

  "constructor": {
    priority: 5,
    levelMin: 3,

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
    },

    body2: [MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK],
    behaviors: ["get_energy_dropped", "get_energy_link", "get_energy_storage", "harvest", "build_structures", "repair", "find_near_energy", "upgrade_controller"]
  },

  'attacker': {
    produceGlobal: false,
    priority: 3,
    minLevel: 4,

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, {
        'color': COLOR_RED
      });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'attacker').length < 1;
    },

    body2: [MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK],
    behaviors: ['goto_red_flag', 'attack_enemy']

  },

  'scout': {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, {
        'color': COLOR_WHITE
      });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'scout').length < 3;
    },

    body2: [MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK],
    behaviors: ['goto_white_flag', "get_energy_dropped", "harvest", "transfer_energy_spawn", "transfer_energy_extensions", "build_structures", "upgrade_controller"]
  },

  'claimer': {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, {
        'color': COLOR_WHITE
      });
      if (flags.length === 0 || (flags[0].room && flags[0].room.controller.my)) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'claimer').length < 1;
    },

    body2: [MOVE, CLAIM, MOVE, CLAIM],
    behaviors: ['goto_white_flag', "claim_controller"]
  },

  'filler': {
    produceGlobal: false,
    priority: 7,
    minLevel: 3,

    canBuild: function (rc) {
      return rc.getCreeps("filler").length  < 1;
      // return false;
    },

    body2: [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
    behaviors: ["get_full_storage", "transfer_full_terminal"]
    //behaviors: []
  }

};