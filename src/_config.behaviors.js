function Behavior(name, when, work, completed) {
	this.name = name;
	this.when = when || function () {
		return false;
	}
	this.work = work || function () {};
	this.completed = completed || function () {
		return true;
	};
};

var behaviors = {};

function addBehavior(name, when, work, completed) {
	behaviors[name] = new Behavior(name, when, work, completed);
}

addBehavior("HARVEST",
	function (creep, rc) {
		return (creep.energy < creep.energyCapacity);
	},
	function (creep, rc) {
		var source = null;

		if ( !creep.target ) {
			source = creep.pos.findClosest(rc.getSources());
			if ( closest != null ) {
				creep.target = closest.id;
			}
		}

		if ( source == null ) {
			source = Game.getObjectById(creep.target);
		}

		if ( source ) {
			if ( !creep.isNearTo(source) ) {
				creep.move(source);
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

		if ( !creep.target ) {
			var source = _(rc.getSources()).find(function(s){
					return (rc.getCreeps("miner", source.id).length = 0)
			});
		}

		if ( source == null ) {
			source = Game.getObjectById(creep.target);
		}

		if ( source != ) {
			if ( !creep.pos.isNearTo(source) ) {
				creep.move(source);
			} else {
				creep.harvest(source);
			}
		}
	},
	function (creep, rc) {
		return false;
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


module.exports = behavior;



//
// module.exports = {
//
//   "HARVEST" : new Behavior(
//
//   ),
//
//   // "HARVETS_MINER" : new Behavior(),
//
//   "TRANSPORT_ENERGY" : new Behavior(),
//
//   "STRUCTURES_BUILD" : new Behavior(),
//
//   "STURCUTRES_REPAIR" : new Behavior(),
//
//   "UPGRADE_CONTROLLE" : new Behavior(),
//
//   "FIND_ENERGY" : new Behavior(),
//
//   "GET_ENERGY" : new Behavior(),
//
//   "GET_ENERGY_SPAWN" : new Behavior(),
//
// };
