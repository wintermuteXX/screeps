/*jshint esnext: true */

var ControllerSpawn = require("ControllerSpawn");
var ControllerCreep = require("ControllerCreep");
var ControllerLink = require("ControllerLink");
var ControllerTower = require("ControllerTower");

function ControllerRoom(room, ControllerGame) {
	this.room = room;
	this._find = {};
	this._spawns = [];
	this._towers = [];

	var spawns = this.find(FIND_MY_SPAWNS);
	for (var s in spawns) {
		var spawn = spawns[s];
		this._spawns.push(new ControllerSpawn(spawn, this));
	}

	this.links = new ControllerLink(this);

	var towers = room.find(FIND_MY_STRUCTURES, {
		filter: {
			structureType: STRUCTURE_TOWER
		}
	});

	for (var t in towers) {
		var tower = towers[t];
		this._towers.push(new ControllerTower(tower, this));
	}
}


/**
 * ControllerRoom.run()
 */
ControllerRoom.prototype.run = function () {
	this.analyse();

	this.populate();

	this.links.transferEnergy();

	this.commandCreeps();


	_.each(this._towers, function (tower) {
		tower.fire();
		if (Game.time % global.getInterval('repairTower') === 0) {
			tower.repair();
		}
	})

	this.findResources();
};


/**
 * ControllerRoom.populate()
 */
ControllerRoom.prototype.populate = function () {
	if (Game.time % global.getInterval('checkPopulation') !== 0) return;

	var spawn = null;

	var roles = global.getCreepRoles();
	var cfgCreeps = global.getCreepsConfig();

	for (var i in roles) {
		var role = roles[i];
		if (spawn === null) spawn = this.getIdleSpawn();
		if (spawn === null) return;

		var cfg = cfgCreeps[role];
		if (!cfg.produceGlobal || cfg.produceGlobal === false) {
			if (this._shouldCreateCreep(role, cfg)) {
				if (!spawn.createCreep(role, cfg)) {
					return;
				}
				spawn = null;
			}
		}
	}
};

/**
 * 
 * Check for new dropped Energy on floor. Writes in Memory.
 *
 */

ControllerRoom.prototype.findResources = function () {
	if (Game.time % global.getInterval('checkDroppedEnergy') !== 0) return;
	var memory = this.room.memory;
	var droppedResources = {};
	for (var s of this.find(FIND_DROPPED_RESOURCES)) {
	    console.log("Resource: " + s + " " + s.room.name);
		droppedResources[s.id] = {
			'resourceType': s.resourceType,
			'amount': s.amount,
		};
	}

	for (var l of _.filter(this.links.receivers, function (l) {
			return l.energy > 0 && !l.pos.inRangeTo(l.room.controller.pos, 3);
		})) {
		droppedResources[l.id] = {
		    'resourceType': "energy",
			'amount': l.energy,
		};
	}
	for (var c of _.filter(this.find(FIND_STRUCTURES), function (c) {
			return c.structureType === STRUCTURE_CONTAINER;
		})); {
			_.each(c.store, function(amount, resourceType) {
				console.log(c, resourceType, amount);
			});

		    //console.log("Container: " + c + " " + c.room.name);
		//droppedResources[c.id] = {
		//	'resourceType': c.resourceType,
		//	'amount': c.store,
		//};
	}
	memory._droppedResources = droppedResources;
};

/**
 * ControllerRoom._shouldCreateCreep(role, cfg) : boolean
 *
 * Check, if creep should be created
 */

ControllerRoom.prototype._shouldCreateCreep = function (role, cfg) {
	var level = this.getLevel();
	var lReq = cfg.levelMin || 1;
	var lMax = cfg.levelMax || 10;
	if (level < lReq) return false;
	if (lMax < level) return false;

	if (!cfg.canBuild) {
		console.log(role + " : no canBuild() implemented");
		return false;
	}

	return cfg.canBuild(this);
};

/**
 * ControllerRoom.commandCreeps()
 */
ControllerRoom.prototype.commandCreeps = function () {
	var cc = new ControllerCreep(this);
	var creeps = this.find(FIND_MY_CREEPS);

	for (var c in creeps) {
		cc.run(creeps[c]);
	}
};


/**
 * ControllerRoom.find(type)
 */
ControllerRoom.prototype.find = function (type) {
	if (!this._find[type]) {
		this._find[type] = this.room.find(type);
	}
	return this._find[type];
};


/**
 * ControllerRoom.getCreeps(role, target)
 */
ControllerRoom.prototype.getCreeps = function (role, target) {
	var creeps = this.find(FIND_MY_CREEPS);

	if (role || target) {
		var filter = {
			'memory': {}
		};

		if (role) {
			filter.memory.role = role;
		}

		if (target) {
			filter.memory.target = target;
		}

		creeps = _.filter(creeps, filter);
	}

	return creeps;
};


/**
 * ControllerRoom.getController()
 */
ControllerRoom.prototype.getController = function () {
	if (this.room.controller) {
		return this.room.controller;
	}
	return null;
};

ControllerRoom.prototype.findNearLink = function (obj) {
	var links = this.links.senders;
	var thelink = obj.pos.findInRange(links, 1);
	if (thelink) {
		return thelink;
	}
	return null;
};


ControllerRoom.prototype.getEnemys = function () {
	var allowedNameList = ["lur", "starwar15432", "leonyx", "lisp", "rubra", "thekraken", "apemanzilla", "iskillet"]
	var targetList = this.room.find(FIND_HOSTILE_CREEPS, {
		filter: function (foundCreep) {
			for (let i = allowedNameList.length; --i >= 0;) {
				if (foundCreep.owner.username === allowedNameList[i]) return (false);
			}
			return (true);
		}
	});
	return targetList;
};



/**
 * ControllerRoom.getLevel()
 */
ControllerRoom.prototype.getLevel = function () {
	var controller = this.getController();
	if (controller !== null && controller.my) {
		return controller.level;
	}
	return 0;
};


/**
 * ControllerRoom.getIdleSpawn()
 */
ControllerRoom.prototype.getIdleSpawn = function () {
	for (var i in this._spawns) {
		var sc = this._spawns[i];
		if (sc.idle()) {
			return sc;
		}
	}
	return null;
};

/**
 * ControllerRoom.getExtensions()
 */
ControllerRoom.prototype.getExtensions = function () {
	return _.filter(this.find(FIND_MY_STRUCTURES), {
		structureType: STRUCTURE_EXTENSION
	});
};

ControllerRoom.prototype.getMineralContainer = function () {
	var containers = _.filter(this.find(FIND_STRUCTURES), function (f) {
		return f.structureType === STRUCTURE_CONTAINER
	});
	var mineral = this.find(FIND_MINERALS);
	containers = _.filter(containers, function (f) {
		return f.pos.inRangeTo(mineral[0], 2)
	});
	if (containers) {
		return containers[0];
	} else return false
};


ControllerRoom.prototype.getMineralAmount = function () {
	var minerals = this.find(FIND_MINERALS);
	return minerals[0].mineralAmount;
};

/**
 * ControllerRoom.getSources()
 */
ControllerRoom.prototype.getSources = function (defended) {
	var sources = _.filter(this.find(FIND_SOURCES), function (s) {
		return (defended || false) == s.defended;
	});
	return sources;
};

ControllerRoom.prototype._getStructures = function (filter) {
	var result = {};

	var structures = this.room.memory._structures;
	if (structures && filter) {
		var values = _.filter(structures, filter);

		_.each(values, function (value, key) {
			var obj = Game.getObjectById(key);
			if (obj !== null) {
				console.log(key, obj);
				result[key] = obj;
			}
		});
	}

	return result;
};

ControllerRoom.prototype.analyse = function () {
	// TODO: Hard coded CPU Limit? No way
	if (Game.cpuLimit <= 100) return;
	var memory = this.room.memory;

	try {
		var sources = {};
		for (var source of this.find(FIND_SOURCES)) {
			sources[source.id] = {
				'defended': source.defended
			};
		}
		memory._sources = sources;

		var structures = {};
		for (var s of this.find(FIND_STRUCTURES)) {
			structures[s.id] = {
				'structureType': s.structureType,
				'hits': s.hits,
				'hitsMax': s.hitsMax
			};
		}
		memory._structures = structures;
		memory.lastCheck = Game.time;

		if (!this.room.memory.roomType) {

			// source keeper
			let lairs = this.room.find(STRUCTURE_KEEPER_LAIR);
			if (lairs.length > 0) {
				this.room.memory.roomType = "ROOMTYPE_SOURCEKEEPER";
			}

			// core
			if (!this.room.memory.roomType) {
				let sources = this.room.find(FIND_SOURCES);
				if (sources.length === 3) {
					this.room.memory.roomType = "ROOMTYPE_CORE";
				}
			}

			// controller rooms
			if (!this.room.memory.roomType) {
				if (this.room.controller) {
					this.room.memory.roomType = "ROOMTYPE_CONTROLLER";
				} else {
					this.room.memory.roomType = "ROOMTYPE_ALLEY";
				}
			}
		}

	} catch (e) {
		console.log(e);
	}

};

module.exports = ControllerRoom;