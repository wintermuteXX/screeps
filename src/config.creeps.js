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

    body: [
      [MOVE, WORK, CARRY, MOVE],
      [MOVE, WORK, CARRY, MOVE],
      [MOVE, WORK, CARRY, MOVE],
      [MOVE, WORK, CARRY, MOVE],
      [MOVE, WORK, CARRY, MOVE],
      [MOVE, WORK, CARRY, MOVE],
      [MOVE, WORK, CARRY, MOVE],
      [MOVE, WORK, CARRY, MOVE]
    ],

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

    body: [
      [MOVE, WORK, WORK],
      [MOVE, WORK, WORK, WORK, WORK, WORK],
      [MOVE, WORK, WORK, WORK, WORK, WORK, WORK],
      [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, CARRY]
    ],
    behaviors: ["miner_harvest"]
  },

  "miner_mineral": {
    priority: 2,
    levelMin: 5,

    canBuild: function (rc) {
      var miners = rc.getCreeps("miner_mineral");
      var extractor = _.filter(rc.find(FIND_MY_STRUCTURES), function (s) {
        return (s.structureType === STRUCTURE_EXTRACTOR);
      });
      
      return (extractor && rc.getMineralAmount() > 0 && miners < 1);
    },

    body: [
      [MOVE, WORK, WORK],
      [MOVE, WORK, WORK, WORK, WORK, WORK],
      [MOVE, WORK, WORK, WORK, WORK, WORK, WORK],
      [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK]
    ],
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

    body: [
      null,
      [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
    ],

    behaviors: ["get_energy_link", "get_energy_dropped", "get_energy_container", "get_energy_storage", "transfer_energy_extensions", "transfer_energy_spawn", "transfer_energy_tower",  "transfer_energy_storage", "transfer_energy_upgrader"]
  },

  "upgrader": {
    priority: 4,
    levelMin: 2,

    canBuild: function (rc) {
      var controller = rc.getController();
      return (controller && controller.my && rc.getCreeps('upgrader').length < 1);
    },

    body: [
      [MOVE, WORK, WORK, CARRY],
      [MOVE, WORK, WORK, WORK, WORK, CARRY, CARRY],
      [MOVE, WORK, WORK, WORK, WORK, CARRY, CARRY],
      [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY],
      [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY]

    ],

    behaviors: ["goto_controller", "find_near_energy", "upgrade_controller"]
  },

  "constructor": {
    priority: 5,
    levelMin: 3,

    canBuild: function (rc) {
      var towers = rc.find(FIND_MY_STRUCTURES, {
		  filter: { structureType: STRUCTURE_TOWER }
      });

      var structures = _.filter(rc.find(FIND_STRUCTURES), function (s) {
      return s.needsRepair();
      });
      // return rc.getCreeps("constructor").length < 2;
    
      return (((rc.find(FIND_CONSTRUCTION_SITES).length > 0) || (towers.length < 1 && structures.length > 0)) && rc.getCreeps("constructor").length < 2);
    },

    body: [
      null,
      null,
      [MOVE, MOVE, WORK, WORK, CARRY, CARRY],
      [MOVE, MOVE, MOVE, WORK, WORK, WORK, CARRY, CARRY],
      [MOVE, MOVE, WORK, CARRY, MOVE, MOVE, WORK, CARRY, MOVE, MOVE, WORK, CARRY],
      [MOVE, MOVE, WORK, CARRY, MOVE, MOVE, WORK, CARRY, MOVE, MOVE, WORK, CARRY, MOVE, MOVE, WORK, CARRY],
    ],

    behaviors: ["get_energy_dropped", "get_energy_link", "get_energy_storage", "harvest", "build_structures", "repair", "find_near_energy", "upgrade_controller"]
  },

  'attacker': {
    produceGlobal: false,
    priority: 3,
    minLevel: 4,

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, { 'color': COLOR_RED });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'attacker').length < 1;
    },

    body: [
      [TOUGH, ATTACK, MOVE, MOVE],
      [TOUGH, TOUGH, TOUGH, ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE],
      [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    ],

    behaviors: ['goto_red_flag', 'attack_enemy']

  },


  "transporter_mineral": {
    priority: 5,
    levelMin: 3,

    canBuild: function (rc) {
     var transporters = rc.getCreeps('transporter_mineral');
     var container = rc.getMineralContainer(); 
     if (container) {return (_.sum(container.store) > 500 && transporters.length < 1);  }
     else {return false;}  
    },

    body: [
      null,
      [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
    ],

    behaviors: ["get_minerals_container", "transfer_mineral_storage"]
  },

  'scout': {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, { 'color': COLOR_WHITE });
      if (flags.length === 0) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'scout').length < 3;
    },
    
    body: [
      [CARRY, CARRY, WORK, MOVE, MOVE],
      [CARRY, CARRY, WORK, WORK, MOVE, MOVE],
      [CARRY, CARRY, WORK, WORK, WORK, MOVE, MOVE, MOVE],
      [CARRY, CARRY, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE]
    ],
    behaviors: ['goto_white_flag', "get_energy_dropped", "harvest", "transfer_energy_spawn", "transfer_energy_extensions", "build_structures", "upgrade_controller"]
  },

'claimer': {
    produceGlobal: false,
    priority: 6,
    minLevel: 3,

    canBuild: function (rc) {
      var flags = _.filter(Game.flags, { 'color': COLOR_WHITE });
      if (flags.length === 0 || (flags[0].room && flags[0].room.controller.my)) return false;
      return _.filter(Game.creeps, (c) => c.memory.role == 'claimer').length < 1;
    },
body: [
      null,
      null,
      [MOVE, CLAIM],
      [MOVE, CLAIM, MOVE, CLAIM],
      [MOVE, CLAIM, MOVE, CLAIM],
      [MOVE, CLAIM, MOVE, CLAIM],
      [MOVE, CLAIM, MOVE, CLAIM],
      [MOVE, CLAIM, MOVE, CLAIM]
      ],
behaviors: ['goto_white_flag', "claim_controller"]
  },


  'filler': {
    produceGlobal : false,
    priority : 7,
    minLevel : 3,

    canBuild : function(rc) {
        // return rc.getCreeps("filler").length  < 1;
        return false;
    },

    body : [
      [CARRY, MOVE,CARRY, MOVE,CARRY, MOVE],
      [CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE],
      [CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE],
      [CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,CARRY, MOVE,]
    ],

    behaviors : [ "get_energy_storage", "transfer_energy_terminal" ]
  }

};
