var ControllerRoom = require("ControllerRoom");

var ControllerGame = function () {
	this.garbageCollection();

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

ControllerGame.prototype.garbageCollection = function () {
	for (var c in Memory.creeps) {
		if (!Game.creeps[c]) {
			delete Memory.creeps[c];
		}
	}

	for (var r in Memory.rooms) {
		if (Memory.rooms[r].lastCheck < Game.time - 30000) {
			delete Memory.rooms[r];
		}
	}


};

module.exports = ControllerGame;