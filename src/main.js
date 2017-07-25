// Game.spawns.Eden.createCreep([WORK, CARRY, MOVE, CARRY, MOVE], null, {role: 'builder'});
// Game.spawns.Eden.createCreep([MOVE, CARRY, MOVE, CARRY, MOVE, CARRY], null, {role: 'transporter'});
// Game.spawns.Winterfell.createCreep([MOVE, CARRY, WORK, WORK, WORK, WORK], null, {role: 'upgrader'});

var profiler = require('screeps-profiler');
var Traveler = require('Traveler');

// profiler.enable();
module.exports.loop = function () {
  profiler.wrap(function () {
    // Main.js logic should go here.
    require("_init");
    var ControllerGame = require('ControllerGame');
    var gc = new ControllerGame();
    gc.garbageCollection();
    gc.processRooms();
  })
}