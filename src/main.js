// To - DO:
// Automatisches bauen auf Grundlage eines vorher berechneten Layouts
// Expansion automatisieren
// Aufklärung Observer
// Mineralien

// Game.spawns.Spawn1.createCreep([WORK, CARRY, MOVE, CARRY, MOVE], null, {role: 'builder'});


var profiler = require('screeps-profiler');

// profiler.enable();
  module.exports.loop = function() {
   profiler.wrap(function() {
    // Main.js logic should go here.
    require("_init");
    var GameController = require('GameController');
    var gc = new GameController();
    gc.garbageCollection();
    gc.processRooms();
    })
  }