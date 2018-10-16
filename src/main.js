/// <reference path="..\ScreepsAutocomplete\_references.js" />
// Game.spawns.Kassel.spawnCreep([WORK, CARRY, MOVE, CARRY, MOVE], 'Builder_666', {memory: {role: 'builder'}});
// Game.spawns.Kassel.spawnCreep([MOVE, CARRY, MOVE, CARRY, MOVE, CARRY], 'Transporter_666', {memory: {role: 'transporter'}});
// Game.spawns.Kassel.spawnCreep([MOVE, CARRY, MOVE, CARRY, WORK, WORK, WORK, WORK, WORK, WORK], 'Upgrader_666', {memory: {role: 'upgrader'}});
// Game.market.createOrder(ORDER_BUY, RESOURCE_ENERGY, 0.01, 30000, "E68S47");
// Game.market.deal('59d1e4719b0a8a64bbfdd5dc', 30000, "E68S47");
// Game.market.changeOrderPrice('59d232ed78c2755738b3105e', 0.14);
// Game.market.extendOrder('59edcfbcbd894910c4e2fff1', 100000);

var profiler = require('screeps-profiler');
var Traveler = require('Traveler');
// var stats = require('ControllerStats');

// profiler.enable();
module.exports.loop = function () {
  profiler.wrap(function () {
    // Main.js logic should go here.
    require("_init");
    var ControllerGame = require('ControllerGame');
    var gc = new ControllerGame();
    //gc.garbageCollection();
    gc.processRooms();
  })
  //stats.doStats();
}