var RoomController = require("RoomController");

var GameController = function() {
	this.garbageCollection();

	this._rooms = {};
	for (var r in Game.rooms) {
		var room = Game.rooms[r];
		this._rooms[room.name] = new RoomController(room, this);
	}
};

GameController.prototype.processRooms = function () {
	for (var i in this._rooms) {
		this._rooms[i].run();
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
