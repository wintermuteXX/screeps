/*jshint esnext: true */

var ControllerSpawn = require("ControllerSpawn");
var ControllerCreep = require("ControllerCreep");
var ControllerLink = require("ControllerLink");
var ControllerTower = require("ControllerTower");

var Debugger = require("_debugger");

function ControllerRoom(room, ControllerGame) {
	this.room = room;

   global.Cache = {};
   global.Cache.rooms = {};
   global.Cache.rooms[room.name] = {};
   
   global.Cache.rooms[room.name].emptyExtensions = _.filter(room.find(FIND_MY_STRUCTURES), function(s){
      if (s.structureType === STRUCTURE_EXTENSION) { return s.energy < s.energyCapacity; }});
   
   global.Cache.rooms[room.name].droppedResources = room.find(FIND_DROPPED_RESOURCES);
   global.Cache.rooms[room.name].emptytowers = _.filter(room.find(FIND_MY_STRUCTURES), function(s){
      if (s.structureType === STRUCTURE_TOWER) { return s.energy < s.energyCapacity; }});
   global.Cache.rooms[room.name].towers = room.find(FIND_MY_STRUCTURES, {
    	filter: { structureType: STRUCTURE_TOWER } });

	this._find = {};
	this._spawns = [];
	this._towers = [];
	
	var spawns = this.find(FIND_MY_SPAWNS);
	for (var s in spawns) {
		var spawn = spawns[s];
		this._spawns.push(new ControllerSpawn(spawn, this));
	}

	this.links = new ControllerLink(this);

	for (var t in global.Cache.rooms[room.name].towers) {
		var tower = global.Cache.rooms[room.name].towers[t];
		this._towers.push(new ControllerTower(tower, this));
	}


	// global.initRoom(this);
}


/**
 * ControllerRoom.run()
 */
ControllerRoom.prototype.run = function () {
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

	this._towers.fire();
	
};


/**
 * ControllerRoom.populate()
 */
ControllerRoom.prototype.populate = function () {
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
ControllerRoom.prototype.getController = function() {
	if (this.room.controller) {
		return this.room.controller;
	}
	return null;
};


/**
 * ControllerRoom.getLevel()
 */
ControllerRoom.prototype.getLevel = function () {
	var controller = this.getController();
	if ( controller !== null && controller.my ) {
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
 * ControllerRoom.getMaxEnergy()
 */
ControllerRoom.prototype.getMaxEnergy = function () {
	var extensionCount = this.getExtensions().length;
	return 300 + (extensionCount * 50);
};
// TODO: Level 7 can be 100 Energy. 8 = 200

/**
 * ControllerRoom.getExtensions()
 */
ControllerRoom.prototype.getExtensions = function() {
	return _.filter(this.find(FIND_MY_STRUCTURES), {
		structureType: STRUCTURE_EXTENSION
	});
};


/**
 * ControllerRoom.getSources()
 */
ControllerRoom.prototype.getSources = function (defended) {
	var sources = _.filter(this.find(FIND_SOURCES), function(s) {
		return (defended || false) == s.defended;
	});
	return sources;
};

ControllerRoom.prototype._getStructures = function(filter) {
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

ControllerRoom.prototype.analyse = function() {
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

module.exports = ControllerRoom;
