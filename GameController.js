var RoomController = require("RoomController");

function GameController() {
	this.garbageCollection();

	this.config = require("_config");
	this._rooms = {};
	for (var room of Game.rooms) {
		this._rooms[room.name] = new RoomController(room, this);
	}
}

GameController.prototype.processRooms = function () {
	for (var rc of this._rooms) {
		rc.populate();
	}
}

GameController.prototype.processGlobal = function () {

}

GameController.prototype.garbageCollection = function () {
  for ( var c in Memory.creeps ) {
    if ( !Game.creeps[c] ) {
      delete Memory.creeps[c];
    }
  }
}

module.exports = GameController;
