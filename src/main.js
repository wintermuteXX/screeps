// To - DO:
// Automatisches bauen auf Grundlage eines vorher berechneten Layouts
// Expansion automatisieren
// Aufklärung Observer
// Mineralien

// Game.spawns.Eden.createCreep([WORK, CARRY, MOVE, CARRY, MOVE], null, {role: 'builder'});
// Game.spawns.Eden.createCreep([MOVE, CARRY, MOVE, CARRY, MOVE, CARRY], null, {role: 'transporter'});


var profiler = require('screeps-profiler');

// profiler.enable();
  module.exports.loop = function() {
   profiler.wrap(function() {
    // Main.js logic should go here.
    require("_init");
    var ControllerGame = require('ControllerGame');
    var gc = new ControllerGame();
    gc.garbageCollection();
    gc.processRooms();
    })
  }