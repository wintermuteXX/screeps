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
        const currentLevel = room.controller.level;
        const currentProgress = room.controller.progress;
        const currentProgressTotal = room.controller.progressTotal;
        
        Memory.stats["rooms." + roomName + ".rcl.level"] = currentLevel;
        Memory.stats["rooms." + roomName + ".rcl.progress"] = currentProgress;
        Memory.stats["rooms." + roomName + ".rcl.progressTotal"] = currentProgressTotal;
        
        // Use rclUpgradeTimes from ControllerRoom.measureRclUpgradeTime()
        if (!Memory.rooms) {
          Memory.rooms = {};
        }
        if (!Memory.rooms[roomName]) {
          Memory.rooms[roomName] = {};
        }
        
        const rclUpgradeTimes = Memory.rooms[roomName].rclUpgradeTimes;
        
        if (rclUpgradeTimes) {
          // Calculate time since reaching current level
          if (rclUpgradeTimes.lastLevelTick !== undefined) {
            const timeSinceLevelUp = Game.time - rclUpgradeTimes.lastLevelTick;
            Memory.stats["rooms." + roomName + ".rcl.currentLevelTime"] = timeSinceLevelUp;
          }
          
          // Store all upgrade times in stats for easy access
          // Note: rclUpgradeTimes stores level as key (e.g., "2" = time from level 1 to 2)
          // For stats, we want to store it as "upgradeTime.fromLevel" (e.g., "1" = time from level 1 to 2)
          _.forEach(rclUpgradeTimes, function (value, key) {
            // Skip metadata fields
            if (key === "lastLevel" || key === "lastLevelTick") {
              return;
            }
            // Convert level key to "fromLevel" for stats (e.g., "2" -> "1" means time from 1 to 2)
            const fromLevel = parseInt(key) - 1;
            if (!isNaN(fromLevel) && fromLevel > 0) {
              Memory.stats["rooms." + roomName + ".rcl.upgradeTime." + fromLevel] = value;
            }
          });
        } else {
          // Fallback if rclUpgradeTimes doesn't exist yet
          Memory.stats["rooms." + roomName + ".rcl.currentLevelTime"] = 0;
        }
        
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
