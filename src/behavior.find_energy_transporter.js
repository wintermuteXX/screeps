var Behavior = require("_behavior");

var b = new Behavior("find_energy_transporter");

b.when = function (creep, rc) {
	return (creep.energy === 0);
};

b.completed = function (creep, rc) {
	var target = Game.getObjectById(creep.target);
	return (target === null || creep.energy === creep.energyCapacity);
};

b.work = function (creep, rc) {

	var target = creep.getTarget();

	if (!target) {
		var miner = Game.getObjectById(creep.memory.miner || null);

		if (miner !== null) {
			var minerSource = miner.getTarget();
			if (!minerSource || !miner.pos.isNearTo(minerSource)) {
				return;
			}

			var energy = miner.pos.findInRange(rc.find(FIND_DROPPED_RESOURCES), 2);

			if (energy.length) {
				target = energy[0];
				creep.target = target.id;
			}
		}
	}

	if (target !== null) {
		if (!creep.pos.isNearTo(target)) {
			creep.moveToEx(target);
		} else {
			creep.pickup(target);
			creep.target = null;
		}
	}
};

module.exports = b;
