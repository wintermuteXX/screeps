var SpawnController = require("SpawnController");

var _config = {

	'checkConstructions': 100

};

function RoomController(room, gameController) {
	this.room = room;
	this.gameController = gameController;

	this._find = {};

	this._spawns = [];
	for (var spawn of this.find(FIND_MY_SPAWNS)) {
		this._spawns.push(new SpawnController(spawn, this));
	}

}

RoomController.prototype.find = function (type) {
	if (!this._find[type]) {
		this._find[type] = this.room.find(type);
	}
	return this._find[type];
}

RoomController.prototype.getLevel = function () {
	if (this.room.controller && this.room.controller.my) {
		return this.room.controller.level;
	}
	return null;
}

RoomController.prototype.populate = function () {
	var spawn = this.getIdleSpawn();
	if (spawn == null) return;


}

RoomController.prototype.getIdleSpawn = function () {
	for (var sc of this._spawns) {
		if (sc.idle()) {
			return sc;
		}
	}
	return null;
}

RoomController.prototype.getMaxEnergy = function () {
	var extensionCount = _.filter(this.find(FIND_MY_STRUCTURES), {
		structureType: STRUCTURE_EXTENSION
	}).length;
	return 300 + (extensionCount * 50);
}

RoomController.prototype.getSources = function () {
	return _.filter(this.find(FIND_SOURCES), function (s) {
		// TODO: Check, if source is defended by Source Keeper
		return true;
	});
}

RoomController.prototyp.planConstructions = function () {
	if (Game.time % _config.checkConstructions != 0) return;

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
