module.exports = {

  //TODO Activate Logs and log the used CPU -> memory.stats.cpu.used (Array with history)
  doStats() {
    if (!Memory.stats) {
      Memory.stats = {}
    }

    /* Memory.stats['cpu.limit'] = Game.cpu.limit
    Memory.stats['cpu.bucket'] = Game.cpu.bucket
    Memory.stats['gcl.controllerProgress'] = Game.gcl.progress
    Memory.stats['gcl.controllerProgressTotal'] = Game.gcl.progressTotal
    Memory.stats['gcl.level'] = Game.gcl.level
    Memory.stats['credits'] = Game.market.credits
    Memory.stats['numberOfCreeps'] = Object.keys(Game.creeps).length
    
    _.forEach(Object.keys(Game.rooms), function (roomName) {
      let room = Game.rooms[roomName]
      if (room.controller && room.controller.my) {
        Memory.stats['rooms.' + roomName + '.rcl.level'] = room.controller.level
        Memory.stats['rooms.' + roomName + '.rcl.progress'] = room.controller.progress
        Memory.stats['rooms.' + roomName + '.rcl.progressTotal'] = room.controller.progressTotal
        Memory.stats['rooms.' + roomName + '.spawn.energy'] = room.energyAvailable
        Memory.stats['rooms.' + roomName + '.spawn.energyTotal'] = room.energyCapacityAvailable
        if (room.storage) {
          
          _.forEach(room.storage.store, (quantity, item) => {
            Memory.stats['rooms.' + roomName + ".storage." + item] = quantity;
          })
        }

        if (room.terminal) {
          _.forEach(room.terminal.store, (quantity, item) => {
            Memory.stats['rooms.' + roomName + ".terminal." + item] = quantity;
          })
        }
      }
    }) */
    if (!Memory.stats.cpu1Tick) {
      Memory.stats.cpu1Tick = []
    }
    if (!Memory.stats.cpu100Tick) {
      Memory.stats.cpu100Tick = []
    }
    if (!Memory.stats.cpu10000Tick) {
      Memory.stats.cpu10000Tick = []
    }

    if (Memory.stats.cpu1Tick.length >= 100) {
      let sum = Memory.stats.cpu1Tick.reduce((previous, current) => current += previous);
      let avg = sum / Memory.stats.cpu1Tick.length;
      avg = Math.round((avg * 10) / 10)
      Memory.stats.cpu100Tick.push(avg);
      Memory.stats.cpu1Tick = []
    }

    if (Memory.stats.cpu100Tick.length >= 100) {
      let sum2 = Memory.stats.cpu100Tick.reduce((previous, current) => current += previous);
      let avg2 = sum2 / Memory.stats.cpu100Tick.length;
      avg2 = Math.round((avg2 * 10) / 10)
      Memory.stats.cpu10000Tick.push(avg2);
      Memory.stats.cpu100Tick = []
    }

    if (Memory.stats.cpu10000Tick.length > 100) {
      Memory.stats.cpu10000Tick.shift();
    }
    Memory.stats.cpu1Tick.push(Math.round(Game.cpu.getUsed() * 10) / 10)
  }
}