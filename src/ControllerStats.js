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
        
        // Initialize RCL tracking memory if not exists
        if (!Memory.rooms) {
          Memory.rooms = {};
        }
        if (!Memory.rooms[roomName]) {
          Memory.rooms[roomName] = {};
        }
        if (!Memory.rooms[roomName].rclTracking) {
          Memory.rooms[roomName].rclTracking = {
            lastLevel: currentLevel,
            lastLevelTick: Game.time,
            upgradeTimes: {} // Stores upgrade time for each level (level -> ticks)
          };
        }
        
        const rclTracking = Memory.rooms[roomName].rclTracking;
        
        // Check if RCL level increased
        if (currentLevel > rclTracking.lastLevel) {
          // Calculate upgrade time for the previous level
          const upgradeTime = Game.time - rclTracking.lastLevelTick;
          rclTracking.upgradeTimes[rclTracking.lastLevel] = upgradeTime;
          
          // Store upgrade time in stats
          Memory.stats["rooms." + roomName + ".rcl.upgradeTime." + rclTracking.lastLevel] = upgradeTime;
          
          // Update tracking
          rclTracking.lastLevel = currentLevel;
          rclTracking.lastLevelTick = Game.time;
          
          // Store current level upgrade time (time since reaching current level)
          Memory.stats["rooms." + roomName + ".rcl.currentLevelTime"] = 0;
        } else {
          // Calculate time since reaching current level
          const timeSinceLevelUp = Game.time - rclTracking.lastLevelTick;
          Memory.stats["rooms." + roomName + ".rcl.currentLevelTime"] = timeSinceLevelUp;
        }
        
        // Store all upgrade times in stats for easy access
        _.forEach(rclTracking.upgradeTimes, function (upgradeTime, level) {
          Memory.stats["rooms." + roomName + ".rcl.upgradeTime." + level] = upgradeTime;
        });
        
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
