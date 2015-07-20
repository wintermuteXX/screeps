var RoomController = require("RoomController");
var Debugger = require("_debugger");

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
		var debug = new Debugger("processing room " + i);
		this._rooms[i].run();
		debug.end();
	}
};

GameController.prototype.processGlobal = function () {
	// TODO: implement global logic
};

GameController.prototype.scout = function() {
	var whiteFlags = _.filter(Game.flags, {filter: { 'color' : COLOR_WHITE }});

	for ( var f in whiteFlags ) {
		var flag = whiteFlags[f];

		var spawn = flag.pos.findClosest(Game.spawns);
		console.log(spawn);
	}
};

GameController.prototype.garbageCollection = function () {
	for (var c in Memory.creeps) {
		if (!Game.creeps[c]) {
			delete Memory.creeps[c];
		}
	}
};

module.exports = GameController;
