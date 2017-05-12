/*jshint esnext: true */

var SpawnController = require("SpawnController");
var CreepController = require("CreepController");
var LinkController = require("LinkController");
var Debugger = require("_debugger");

function RoomController(room, gameController) {
	this.room = room;

   global.Cache = {};
   global.Cache.rooms = {};
   global.Cache.rooms[room.name] = {};
   
   global.Cache.rooms[room.name].emptyExtensions = _.filter(room.find(FIND_MY_STRUCTURES), function(s){
      if (s.structureType === STRUCTURE_EXTENSION) { return s.energy < s.energyCapacity; }});
   
   global.Cache.rooms[room.name].droppedResources = room.find(FIND_DROPPED_RESOURCES);
   global.Cache.rooms[room.name].towers = _.filter(room.find(FIND_MY_STRUCTURES), function(s){
      if (s.structureType === STRUCTURE_TOWER) { return s.energy < s.energyCapacity; }});
   
   // if (global.Cache.rooms[room.name].droppedResources)
   // { console.log("Dropped Res: " + global.Cache.rooms[room.name].droppedResources); }
   
	this._find = {};
	this._spawns = [];

	var spawns = this.find(FIND_MY_SPAWNS);
	for (var s in spawns) {
		var spawn = spawns[s];
		this._spawns.push(new SpawnController(spawn, this));
	}

	this.links = new LinkController(this);

	// global.initRoom(this);
}


/**
 * RoomController.run()
 */
RoomController.prototype.run = function () {
	this.analyse();

	// var debug = new Debugger(this.room + ": populate");
	this.populate();
	// debug.end();

	// debug = new Debugger(this.room + ": transferEnergy");
	this.links.transferEnergy();
	// debug.end();

	// debug = new Debugger(this.room + ": commandCreeps");
	this.commandCreeps();
	// debug.end();
};


/**
 * RoomController.populate()
 */
RoomController.prototype.populate = function () {
		if (Game.time % global.getInterval('checkPopulation') !== 0) return;

		var spawn = null;

    var roles = global.getCreepRoles();
		var cfgCreeps = global.getCreepsConfig();

		for ( var i in roles ) {
			var role = roles[i];
			if (spawn === null) spawn = this.getIdleSpawn();
			if (spawn === null) return;

			var cfg = cfgCreeps[role];
			if ( !cfg.produceGlobal || cfg.produceGlobal === false ) {
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
 * RoomController._shouldCreateCreep(role, cfg) : boolean
 *
 * Check, if creep should be created
 */

RoomController.prototype._shouldCreateCreep = function (role, cfg) {
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
 * RoomController.commandCreeps()
 */
RoomController.prototype.commandCreeps = function () {
	var cc = new CreepController(this);
	var creeps = this.find(FIND_MY_CREEPS);

	for (var c in creeps) {
		cc.run(creeps[c]);
	}
};


/**
 * RoomController.find(type)
 */
RoomController.prototype.find = function (type) {
	if (!this._find[type]) {
		this._find[type] = this.room.find(type);
	}
	return this._find[type];
};


/**
 * RoomController.getCreeps(role, target)
 */
RoomController.prototype.getCreeps = function (role, target) {
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
 * RoomController.getController()
 */
RoomController.prototype.getController = function() {
	if (this.room.controller) {
		return this.room.controller;
	}
	return null;
};


/**
 * RoomController.getLevel()
 */
RoomController.prototype.getLevel = function () {
	var controller = this.getController();
	if ( controller !== null && controller.my ) {
		return controller.level;
	}
	return 0;
};


/**
 * RoomController.getIdleSpawn()
 */
RoomController.prototype.getIdleSpawn = function () {
	for (var i in this._spawns) {
		var sc = this._spawns[i];
		if (sc.idle()) {
			return sc;
		}
	}
	return null;
};


/**
 * RoomController.getMaxEnergy()
 */
RoomController.prototype.getMaxEnergy = function () {
	var extensionCount = this.getExtensions().length;
	return 300 + (extensionCount * 50);
};
// TODO: Level 7 can be 100 Energy. 8 = 200

/**
 * RoomController.getExtensions()
 */
RoomController.prototype.getExtensions = function() {
	return _.filter(this.find(FIND_MY_STRUCTURES), {
		structureType: STRUCTURE_EXTENSION
	});
};


/**
 * RoomController.getSources()
 */
RoomController.prototype.getSources = function (defended) {
	var sources = _.filter(this.find(FIND_SOURCES), function(s) {
		return (defended || false) == s.defended;
	});
	return sources;
};

RoomController.prototype._getStructures = function(filter) {
	var result = {};

	var structures = this.room.memory._structures;
	if ( structures && filter ) {
		var values = _.filter(structures, filter);

		_.each(values, function(value, key){
			var obj = Game.getObjectById(key);
			if ( obj !== null ) {
			    console.log(key, obj);
					result[key] = obj;
			}
		});
	}

	return result;
};

RoomController.prototype.analyse = function() {
	// TODO: Hard coded CPU Limit? No way
	if ( Game.cpuLimit <= 100 ) return;
	var memory = this.room.memory;

	try {
		var sources = {};
		for ( var source of this.find(FIND_SOURCES) ) {
			sources[source.id] = {
				'defended' : source.defended
			};
		}
		memory._sources = sources;

		var structures = {};
		for ( var s of this.find(FIND_STRUCTURES) ) {
			structures[s.id] = {
				'structureType' : s.structureType,
				'hits' : s.hits,
				'hitsMax' : s.hitsMax
			};
		}
		memory._structures = structures;

	} catch ( e ) {
		console.log(e);
	}

};

module.exports = RoomController;
