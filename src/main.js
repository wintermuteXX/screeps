// Game.spawns.Eden.createCreep([WORK, CARRY, MOVE, CARRY, MOVE], null, {role: 'builder'});
// Game.spawns.Eden.createCreep([MOVE, CARRY, MOVE, CARRY, MOVE, CARRY], null, {role: 'transporter'});
// Game.spawns.Southgate.createCreep([MOVE, CARRY, MOVE, CARRY, WORK, WORK, WORK, WORK, WORK, WORK], null, {role: 'upgrader'});
// Game.market.createOrder(ORDER_BUY, RESOURCE_ENERGY, 0.01, 30000, "E68S47");
// Game.market.deal('59d1e4719b0a8a64bbfdd5dc', 30000, "E68S47");
// Game.market.changeOrderPrice('59d232ed78c2755738b3105e', 0.14);
// Game.market.extendOrder('59edcfbcbd894910c4e2fff1', 100000);

var profiler = require('screeps-profiler');
var Traveler = require('Traveler');

// test
Memory.stats['cpu.limit'] = Game.cpu.limit
Memory.stats['cpu.bucket'] = Game.cpu.bucket
Memory.stats['gcl.controllerProgress'] = Game.gcl.progress
Memory.stats['gcl.controllerProgressTotal'] = Game.gcl.progressTotal
Memory.stats['gcl.level'] = Game.gcl.level
_.forEach(Object.keys(Game.rooms), function(roomName){
  let room = Game.rooms[roomName]
  if(room.controller && room.controller.my){
  Memory.stats['rooms.' + roomName + '.rcl.level'] = room.controller.level
  Memory.stats['rooms.' + roomName + '.rcl.progress'] = room.controller.progress
  Memory.stats['rooms.' + roomName + '.rcl.progressTotal'] = room.controller.progressTotal
  Memory.stats['rooms.' + roomName + '.spawn.energy'] = room.energyAvailable
  Memory.stats['rooms.' + roomName + '.spawn.energyTotal'] = room.energyCapacityAvailable
  if(room.storage){
  Memory.stats['rooms.' + roomName + '.storage.energy'] = room.storage.store.energy
  }
  }
  })
// test end


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
Memory.stats['cpu.getUsed'] = Game.cpu.getUsed()