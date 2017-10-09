// Game.spawns.Eden.createCreep([WORK, CARRY, MOVE, CARRY, MOVE], null, {role: 'builder'});
// Game.spawns.Eden.createCreep([MOVE, CARRY, MOVE, CARRY, MOVE, CARRY], null, {role: 'transporter'});
// Game.spawns.Southgate.createCreep([MOVE, CARRY, MOVE, CARRY, WORK, WORK, WORK, WORK, WORK, WORK], null, {role: 'upgrader'});
// Game.market.createOrder(ORDER_BUY, RESOURCE_ENERGY, 0.01, 30000, "E68S47");
// Game.market.deal('59d1e4719b0a8a64bbfdd5dc', 30000, "E68S47");
// Game.market.changeOrderPrice('59d232ed78c2755738b3105e', 0.14);

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