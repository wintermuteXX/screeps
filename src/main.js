// To - DO:
// X FIXED - During game start. Constructors try to repair protection wall with 1/1 hit. Why?
// X Builder Creeps just harvest 1 source. 
// X Scout + Behavior.claim_controller umgesetzt
// X Buildscreeps can fail if there is not much energy and 3 constructors are building. Takes a long time until 1 builder gets the job done. (No building if miner/transporter is 0)
// X Miner should automatically fill Link)
// - find dropped energy choose target with random, even fail should be possible when there are links. And a minimun of dropped energy (>50
// - Builders can block themselves if trying to upgrade controller
// - Links automatisch bauen
// - Storage automatisch bauen
// - Extensions automatisch bauen
// - Statistik "Raumqualitaet" (Anzahl Sources, Entferung, Swamps)

require("_init");
var profiler = require('screeps-profiler');



profiler.enable();

  module.exports.loop = function() {
    profiler.wrap(function() {
    // Main.js logic should go here.
    var GameController = require('GameController');
    var gc = new GameController();
    gc.garbageCollection();
    gc.processRooms();
    })
  }