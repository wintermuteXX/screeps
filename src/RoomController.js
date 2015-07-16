var SpawnController = require("SpawnController");
var CreepController = require("CreepController");
var LinkController = require("LinkController");

function RoomController(room, gameController) {
	// this.gameController = gameController;

	this.room = room;
	this.config = gameController.config;
	this._find = {};

	this._spawns = [];
	for (var spawn of this.find(FIND_MY_SPAWNS)) {
		this._spawns.push(new SpawnController(spawn, this));
	}
}


/**
 * RoomController.run()
 */
RoomController.prototype.run = function() {

}


/**
 * RoomController.populate()
 */
RoomController.prototype.populate = function () {
	if ( Game.time % this.config.interval.checkPopulation != 0 ) return;

	var cfgCreeps = _(this.config.creeps).sort(function(cfg) {
		return cfg.priority || 99;
	});

	var spawn = null;
	for ( var role in cfgCreeps ) {
		if ( spawn == null ) spawn = this.getIdleSpawn();
		if ( spawn == null ) return;

		var cfg = cfgCreeps[role];

		if ( this._shouldCreateCreep(role, cfg) ) {
			if ( !spawn.createCreep(role, cfg) ) {
					return;
			}
			spawn = null;
		}
	}
}

/**
 * RoomController._shouldCreateCreep(role, cfg) : boolean
 *
 * Check, if creep should be created
 */

RoomController.prototype._shouldCreateCreep = function(role, cfg) {
		var level = this.getLevel();
		var lReq = cfg.levelRequired || 1;

		if ( level < lReq ) {
			return false;
		}

		if ( cfg.levelMax && level > cfg.levelMax )	 {
			return false;
		}

		if ( !cfg.canBuild )	 {
			console.log(role + " : no canBuild() implemented");
			return false;
		}

		return cfg.canBuild(this);
}

/**
 * RoomController.commandCreeps()
 */
RoomController.prototype.commandCreeps = function() {
	var cc = new CreepController(this);
	for ( var creep of this.find(FIND_MY_CREEPS) ) {
		cc.run(creep);
	}
}


/**
 * RoomController.find(type)
 */
RoomController.prototype.find = function (type) {
	if (!this._find[type]) {
		this._find[type] = this.room.find(type);
	}
	return this._find[type];
}


/**
 * RoomController.getCreeps(role, target)
 */
RoomController.prototype.getCreeps = function(role, target) {
	var creeps = this.find(FIND_MY_CREEPS);

	if ( role || target ) {
		var filter = { 'memory' : {}};

		if ( role ) {
			filter.memory.role = role;
		}

		if ( target ) {
			filter.memory.target = target;
		}

		creeps = _(creeps).filter(filter);
	}

	return creep;
}


/**
 * RoomController.getLevel()
 */
RoomController.prototype.getLevel = function () {
	if (this.room.controller && this.room.controller.my) {
		return this.room.controller.level;
	}
	return null;
}


/**
 * RoomController.getIdleSpawn()
 */
RoomController.prototype.getIdleSpawn = function () {
	for (var i in this._spawns) {
		var sc = this._spawn[i];
		if (sc.idle()) {
			return sc;
		}
	}
	return null;
}


/**
 * RoomController.getMaxEnergy()
 */
RoomController.prototype.getMaxEnergy = function () {
	var extensionCount = _.filter(this.find(FIND_MY_STRUCTURES), {
		structureType: STRUCTURE_EXTENSION
	}).length;
	return 300 + (extensionCount * 50);
}


/**
 * RoomController.getSources()
 */
RoomController.prototype.getSources = function(defended) {
	var sources = _(this.find(FIND_SOURCES)).filter(functions(s){
		return (defended || false ) == s.defended;
	});
	return sources;
}


/**
 * RoomController.planConstructions()
 */
RoomController.prototyp.planConstructions = function () {
	if (Game.time % this.config.interval.checkConstructions != 0) return;

  if ( this.getLevel() >= 3 ) {
    // NOTE: http://support.screeps.com/hc/en-us/articles/203079011-Room#findPath

    // check roads
    for (var spawn of this.find(FIND_MY_SPAWNS)) {
  		for (var source of this.getSources()) {
  			var path = _findConstructionPath(this.room, spawn, source);
  			if (path.length) {
          for ( var pos of path ) {
            // check, if pos is road



          }
  			}
  		}
  	}
  }

}

function _findConstructionPath(room, from, to) {
	return room.findPath(from, to, {
		ignoreCreeps: true
	});
}


module.exports = RoomController;
