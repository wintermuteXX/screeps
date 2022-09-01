module.exports = {
  doStats() {
    delete Memory.stats;
    if (!Memory.stats) {
      Memory.stats = {};
    }

    // Global values
    Memory.stats["cpu.limit"] = Game.cpu.limit;
    Memory.stats["cpu.tickLimit"] = Game.cpu.tickLimit;
    Memory.stats["cpu.getUsed"] = Game.cpu.getUsed();
    Memory.stats["cpu.bucket"] = Game.cpu.bucket;
    Memory.stats["gcl.controllerProgress"] = Game.gcl.progress;
    Memory.stats["gcl.controllerProgressTotal"] = Game.gcl.progressTotal;
    Memory.stats["gcl.level"] = Game.gcl.level;
    Memory.stats["credits"] = Game.market.credits;
    Memory.stats["numberOfCreeps"] = Object.keys(Game.creeps).length;

    // Average Marekt prices
    for (var i in RESOURCES_ALL) {
      let resource = RESOURCES_ALL[i];
      Memory.stats["avgPrice." + resource] =
        Game.market.getHistory(resource)[0].avgPrice;
    }

    // Room progress
    _.forEach(Object.keys(Game.rooms), function (roomName) {
      let room = Game.rooms[roomName];
      if (room.controller && room.controller.my) {
        Memory.stats["rooms." + roomName + ".rcl.level"] =
          room.controller.level;
        Memory.stats["rooms." + roomName + ".rcl.progress"] =
          room.controller.progress;
        Memory.stats["rooms." + roomName + ".rcl.progressTotal"] =
          room.controller.progressTotal;
        Memory.stats["rooms." + roomName + ".spawn.energy"] =
          room.energyAvailable;
        Memory.stats["rooms." + roomName + ".spawn.energyTotal"] =
          room.energyCapacityAvailable;

        // Resources in Stores
        if (room.storage) {
          _.forEach(room.storage.store, (quantity, item) => {
            Memory.stats["rooms." + roomName + ".storage." + item] = quantity;
          });
        }

        if (room.terminal) {
          _.forEach(room.terminal.store, (quantity, item) => {
            Memory.stats["rooms." + roomName + ".terminal." + item] = quantity;
          });
        }

        if (room.factory) {
          _.forEach(room.factory.store, (quantity, item) => {
            Memory.stats["rooms." + roomName + ".factory." + item] = quantity;
          });
        }
      }
    });
  },
};
