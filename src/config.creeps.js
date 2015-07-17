module.exports = {

	"miner": {
		priority : 2,
    levelMin : 1,

    canBuild : function(rc) {
			var miners = rc.getCreeps("miner");
			var sources = rc.getSources();

			return (miners.length < sources.length);
    },

    body : [
      [MOVE, WORK],
      [MOVE, WORK],
      [MOVE, WORK, WORK]
    ],
    behaviors : [
			"miner_harvest"
		]
  },

	"transporter": {
		priority : 1,
    levelMin : 1,

		canBuild : function(rc) {
			var miners = rc.getCreeps('miner');
			var transpoters = rc.getCreeps('transporter');

			return (transpoters.length < miners.length * 2);
		},

    body : [
			[MOVE, CARRY],
			[MOVE, CARRY],
			[MOVE, MOVE, CARRY, CARRY]
		],

		behaviors : [ "find_energy", "transfer_energy_spawn" ]

  }

};
