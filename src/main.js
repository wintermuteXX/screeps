// To - DO:
// X FIXED - During game start. Constructors try to repair protection wall with 1/1 hit. Why?
// - Builder Creeps just harvest 1 source. 
// - Builders can block themselves if trying to upgrade controller
// - Buildscreeps can fail if there is not much energy and 3 constructors are building. Takes a long time until 1 builder gets the job done. (No building if miner/transporter is 0)
// - Take buildscreeps from Marcel. Only give one big array and try to build, if fails, reduce array 1 part. Again ->  

require("_init");
var GameController = require('GameController');

var gc = new GameController();
gc.garbageCollection();
gc.processRooms();
