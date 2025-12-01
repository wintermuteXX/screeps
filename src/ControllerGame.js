const ControllerRoom = require("ControllerRoom");

var ControllerGame = function () {
	// Garbage collection is now handled by memhack.js
	// This reduces duplicate work and improves performance

	this._rooms = {};
	for (var r in Game.rooms) {
		var room = Game.rooms[r];
		this._rooms[room.name] = new ControllerRoom(room, this);
	}
};

ControllerGame.prototype.processRooms = function () {
	for (var i in this._rooms) {
		this._rooms[i].run();
	}
};

module.exports = ControllerGame;