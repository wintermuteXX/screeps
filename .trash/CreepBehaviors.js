var Behavior = require("CreepBehavior");

var behaviors = [

	new Behavior("HARVEST", {
		when: function (creep, rc) {
			return (creep.energy == 0);
		},
		work: function (creep, rc) {
			
		},
		completed: function (creep, rc) {
			return (creep.energy == creep.energyCapacity);
		}
	}),

	new Behavior("HARVEST_MINER", {}),

	new Behavior("STRUCTURES_BUILD", {}),

	new Behavior("STURCUTRES_REPAIR", {}),

	new Behavior("TRANSPORT_ENERGY", {}),

	new Behavior("FIND_ENERGY", {}),

	new Behavior("FIND_NEAR_ENERGY", {}),

	new Behavior("GET_ENERGY", {}),

	new Behavior("GET_ENERGY_SPAWN", {}),

	new Behavior("UPGRADE_CONTROLLE", {}),

];

module.exports = behaviors;
