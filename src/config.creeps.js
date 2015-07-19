module.exports = {

  "builder": {
    priority: 1,

    canBuild: function(rc) {
      if ( rc.getLevel() > 2 ) {
        return (rc.getCreeps().length === 0);
      } else {
        return rc.getCreeps("builder").length < 5;
      }
    },

    body: [
      [MOVE, WORK, CARRY],
      [MOVE, WORK, CARRY, CARRY, MOVE, MOVE]
    ],

    behaviors: ["find_energy", "harvest", "transfer_energy_spawn", "transfer_energy_extensions", "build_structures", "upgrade_controller"]

  },


  "miner": {
    priority: 2,
    levelMin: 3,

    canBuild: function(rc) {
      var miners = rc.getCreeps("miner");
      var sources = rc.getSources();

      return (miners.length < sources.length);
    },

    body: [
      null,
      null,
      [MOVE, MOVE, WORK, WORK, WORK, WORK, WORK]
    ],
    behaviors: [
      "miner_harvest"
    ]
  },

  "transporter": {
    priority: 1,
    levelMin: 3,

    canBuild: function(rc) {
      var miners = rc.getCreeps('miner');
      var transpoters = rc.getCreeps('transporter');

      return (transpoters.length < miners.length * 2);
    },

    body: [
      null,
      null,
      [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY],
      [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY]
    ],

    behaviors: ["find_energy", "transfer_energy_extensions", "transfer_energy_spawn", "transfer_energy_links", "transfer_energy_upgrader"]
  },

  "upgrader" : {
    priority : 3,
    levelMin : 3,

    canBuild : function(rc) {
      var controller = rc.getController();
      var max = controller.getFreeFields();
      if ( max > 3 ) {
        max = 3;
      }
      return ( rc.getCreeps('upgrader').length < max) ;
    },

    body : [
      null,
      null,
      [MOVE, MOVE, WORK, WORK, WORK, WORK, CARRY, CARRY],
      [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY],
      [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY],
    ],

    behaviors : ["goto_controller", "find_near_energy", "upgrade_controller"]
  },

  "constructor" : {
    priority : 4,
    levelMin : 3,

    canBuild : function(rc) {
      return rc.getCreeps("constructor").length < 3;
    },

    body : [
      null,
      null,
      [MOVE, WORK, CARRY],
      [MOVE, MOVE, WORK, CARRY],
      [MOVE, MOVE, WORK, CARRY, MOVE, MOVE, WORK, CARRY],
      [MOVE, MOVE, WORK, CARRY, MOVE, MOVE, WORK, CARRY, MOVE, MOVE, WORK, CARRY],
    ],

    behaviors : [ "get_energy", "build_structures", "repair" ]

  }

};
