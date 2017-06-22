function applyMiner(rc) {
	if (Game.time % 5 !== 0) return;

	var transporters = rc.getCreeps("transporter");
	if (transporters.length === 0) return;

	var miners = rc.getCreeps("miner");
	var perMiner = transporters.length / miners.length;

	for (var t in transporters) {
		var creep = transporters[t];

		for (var m in miners) {
			var miner = miners[m];

			var tm = _.filter(transporters, {
				'memory': {
					'miner': miner.id
				}
			});

			if (tm.length < perMiner) {
				creep.memory.miner = miner.id;
				break;
			}
		}
	}

}

module.exports = {
	rooms: {
		init: function (rc) {
			applyMiner(rc);
		}
	}
};
