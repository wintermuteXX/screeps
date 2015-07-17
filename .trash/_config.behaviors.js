var behaviors = {};

function Behavior(name, when, work, completed) {
	this.name = name;
	this.when = when || function () {
		return false;
	};
	this.work = work || function () {};
	this.completed = completed || function () {
		return true;
	};
}

function addBehavior(name, when, work, completed) {
	behaviors[name] = new Behavior(name, when, work, completed);
}

addBehavior("HARVEST",
	function (creep, rc) {
		return (creep.energy < creep.energyCapacity);
	},
	function (creep, rc) {
		var source = null;

		if (!creep.target) {
			source = creep.pos.findClosest(rc.getSources());
			if (closest !== null) {
				creep.target = closest.id;
			}
		}

		if (source === null) {
			source = Game.getObjectById(creep.target);
		}

		if (source) {
			if (!creep.isNearTo(source)) {
				creep.moveToEx(source);
			} else {
				creep.harvest(source);
			}
		}
	},
	function (creep, rc) {
		return (creep.energy == creep.energyCapacity);
	}
);

addBehavior("HARVETS_MINER",
	function (creep, rc) {
		return true;
	},
	function (creep, rc) {
		var source = null;

		if (!creep.target) {
			source = _.find(rc.getSources(), function (s) {
				return (rc.getCreeps("miner", s.id).length === 0);
			});
		}

		if (source === null) {
			source = Game.getObjectById(creep.target);
		}

		if (source !== null) {
			if (!creep.pos.isNearTo(source)) {
				console.log(creep, creep.moveTo(source));
			} else {
				creep.harvest(source);
			}
		}
	},
	function (creep, rc) {
		return false;
	}
);

addBehavior("FIND_ENERGY",
	function (creep, rc) {
		return (creep.energy === 0);
	},
	function (creep, rc) {
		var target = Game.getObjectById(creep.target);

		if ( target === null ) {
			var droppedEnergy = rc.find(FIND_DROPPED_ENERGY);
			if ( droppedEnergy.length ) {
				target = droppedEnergy[0];
				creep.target = target.id;
			}
		}

		if ( target !== null ) {
			creep.moveToEx(target);
			creep.pickup(target);
		}

	},
	function (creep, rc) {
		var target = Game.getObjectById(creep.target);
		return (target === null || creep.energy === creep.energyCapacity);
	}
);



addBehavior("TRANSFER_ENERGY_SPAWN",
	function (creep, rc) {
		return false;
	},
	function (creep, rc) {

	},
	function (creep, rc) {
		return true;
	}
);



/** Template: addBehavior
addBehavior("<name>",
	function (creep, rc) {
		return false;
	},
	function (creep, rc) {

	},
	function (creep, rc) {
		return true;
	}
);
 */


module.exports = behaviors;
