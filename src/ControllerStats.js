module.exports = {

  doStats() {

    console.log("Doing stats");
    Memory.stats['cpu.limit'] = Game.cpu.limit
    Memory.stats['cpu.bucket'] = Game.cpu.bucket
    Memory.stats['gcl.controllerProgress'] = Game.gcl.progress
    Memory.stats['gcl.controllerProgressTotal'] = Game.gcl.progressTotal
    Memory.stats['gcl.level'] = Game.gcl.level
    _.forEach(Object.keys(Game.rooms), function (roomName) {
      let room = Game.rooms[roomName]
      if (room.controller && room.controller.my) {
        Memory.stats['rooms.' + roomName + '.rcl.level'] = room.controller.level
        Memory.stats['rooms.' + roomName + '.rcl.progress'] = room.controller.progress
        Memory.stats['rooms.' + roomName + '.rcl.progressTotal'] = room.controller.progressTotal
        Memory.stats['rooms.' + roomName + '.spawn.energy'] = room.energyAvailable
        Memory.stats['rooms.' + roomName + '.spawn.energyTotal'] = room.energyCapacityAvailable
        if (room.storage) {
          Memory.stats['rooms.' + roomName + '.storage.energy'] = room.storage.store.energy
        }
      }
    })

    Memory.stats['cpu.getUsed'] = Game.cpu.getUsed();
  }
}