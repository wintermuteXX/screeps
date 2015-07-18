module.exports = {

  "builder": {
    priority: 1,
    levelMax: 2,

    canBuild: function(rc) {
      return rc.getCreeps("builder").length < 3;
    },

    body: [
      [MOVE, WORK, CARRY],
      [MOVE, WORK, CARRY, CARRY, MOVE, MOVE]
    ],

    behaviors: ["harvest", "transfer_energy_spawn", "transfer_energy_extensions", "build_structures", "upgrade_controller"]

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
      null, [MOVE, WORK, WORK, WORK]
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
      null, [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY]
    ],

    behaviors: ["find_energy", "transfer_energy_spawn", "transfer_energy_extensions"]

  }

};
