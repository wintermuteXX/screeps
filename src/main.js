const CONSTANTS = require("./config.constants");

// Cache all requires at module load time (runs once on global reset)
const memHack = require("./lib.memhack");
require("./lib.traveler"); // Attaches to Creep prototype
const Log = require("./lib.log");
const stats = require("./controller.stats");
require("./service.market");
require("./prototype.init"); // Initialize prototypes once
const ControllerGame = require("./controller.game");
const cpuAnalyzer = require("./service.cpu");

module.exports.loop = function () {
  // Run memhack first to optimize memory access for the entire tick
  memHack.run();
  
  const gc = new ControllerGame();
  
  // Check CPU bucket and skip tick if necessary
  if (gc.checkCpuBucket()) {
    return;
  }

  gc.processRooms();
  
  // Generate pixel if bucket is full (costs 10000 bucket)
  if (Game.cpu.bucket > CONSTANTS.CPU.PIXEL_GENERATION_THRESHOLD) {
    Game.cpu.generatePixel();
  }
  
  gc.updateBucketMemory();
  
  // Record CPU metrics for analysis
  cpuAnalyzer.recordTick();
  
  // stats.doStats();
};