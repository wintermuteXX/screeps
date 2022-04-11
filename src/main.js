var profiler = require('screeps-profiler');
var Traveler = require('Traveler');
global.Log = require('Log');
var stats = require('ControllerStats');
// var helper = require('helperRoomResources')
// var visual = require('RoomVisual');
// profiler.enable();

module.exports.loop = function () {
  profiler.wrap(function () {
    // Main.js logic should go here.
    require("_init");
    Log.success(`------------------ ${Game.time} is running ------------------`, "Main")

    var ControllerGame = require('ControllerGame');
    var gc = new ControllerGame();
    //gc.garbageCollection();
    gc.processRooms();
  })
  if (Game.cpu.bucket > 9000) {
    Game.cpu.generatePixel();
  }
  stats.doStats();
}

// LONGTERM Remote Mining (there was a formula for calculation if RM makes sense)
// LONGTERM Harvest Power
// LONGTERM test attack behavior
// LONGTERM spawn defenders if attacked
// LONGTERM Boost creeps
// LONGTERM Allow creeps to transport more then 1 resource 
// LONGTERM New Task "recycle" for e.g. mineral miner