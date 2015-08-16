// To - DO:
// X FIXED - During game start. Constructors try to repair protection wall with 1/1 hit. Why?
// X Builder Creeps just harvest 1 source. 
// X Scout + Behavior.claim_controller umgesetzt
// - Builders can block themselves if trying to upgrade controller
// - Buildscreeps can fail if there is not much energy and 3 constructors are building. Takes a long time until 1 builder gets the job done. (No building if miner/transporter is 0)

require("_init");
var GameController = require('GameController');

var gc = new GameController();
gc.garbageCollection();
gc.processRooms();
