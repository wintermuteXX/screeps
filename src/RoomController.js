var SpawnController = require("SpawnController");
var CreepController = require("CreepController");

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
 * RoomController.populate()
 */
RoomController.prototype.populate = function () {
	if ( Game.time % this.config.interval.checkPopulation != 0 ) return;

	var cfgCreeps = _(this.config.creeps).sort(function(cfg) {
		return cfg.priority || 99;
	});

	var spawn = this.getIdleSpawn();
	if (spawn == null) return;

	for ( var role in cfgCreeps ) {
		var cfg = cfgCreeps[role];
		if ( cfg.canBuild && cfg.canBuild(this) ) {
			if ( spawn.createCreep(role, cfg) ) {
				spawn = this.getIdleSpawn();
			}
		}
	}
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
RoomController.prototype.getSources = function () {
	return _.filter(this.find(FIND_SOURCES), function (s) {
		// TODO: Check, if source is defended by Source Keeper
		return true;
	});
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
