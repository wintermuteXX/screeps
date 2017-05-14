var ControllerRoom = require("ControllerRoom");
var Debugger = require("_debugger");

var ControllerGame = function() {
	this.garbageCollection();

	this._rooms = {};
	for (var r in Game.rooms) {
		var room = Game.rooms[r];
		this._rooms[room.name] = new ControllerRoom(room, this);
	}
};

ControllerGame.prototype.processRooms = function () {
	for (var i in this._rooms) {
		var debug = new Debugger("processing room " + i);
		this._rooms[i].run();
		debug.end();
	}
};

ControllerGame.prototype.processGlobal = function () {

	// scout
	if ( Game.cpuLimit > 400 ) {
    gc.scout();
	}
};

ControllerGame.prototype.scout = function() {
	var flag = _.find(Game.flags, { 'color' : COLOR_WHITE });
  if ( !flag ) return;

	var fRoom = flag.pos.roomName;

	var spawn = null;
	var steps = 999;
	for ( var s in Game.spawns ) {
		var sp = Game.spawns[s];

		var path = sp.pos.findPathTo(flag);
		if ( path.length && path.length < steps ) {
			steps = path.length;
			spawn = sp;
		}
	}

	if ( spawn !== null ) {
		console.log(spawn);
	}
};



ControllerGame.prototype.garbageCollection = function () {
	for (var c in Memory.creeps) {
		if (!Game.creeps[c]) {
			delete Memory.creeps[c];
		}
	}
};

module.exports = ControllerGame;
