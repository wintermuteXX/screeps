var RoomController = require("RoomController");

var GameController = function() {
	this.garbageCollection();

	this.config = require("_config");
	this._rooms = {};
	for (var r in Game.rooms) {
		var room = Game.rooms[r];
		this._rooms[room.name] = new RoomController(room, this);
	}
};

GameController.prototype.processRooms = function () {
	for (var i in this._rooms) {
		var rc = this._rooms[i];
		rc.populate();
		rc.commandCreeps();
	}
};

GameController.prototype.processGlobal = function () {
	// TODO: implement global logic
};

GameController.prototype.garbageCollection = function () {
	for (var c in Memory.creeps) {
		if (!Game.creeps[c]) {
			delete Memory.creeps[c];
		}
	}
};

module.exports = GameController;
