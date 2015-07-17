require("_init");

try {
 	var GameController = require('GameController');

	var gc = new GameController();
	gc.garbageCollection();
	gc.processRooms();
	// gc.processGlobal();
} catch (e) {
	console.log(e);
}
