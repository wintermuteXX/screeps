const CONSTANTS = require("./config.constants");

// Cache all requires at module load time (runs once on global reset)
const memHack = require("./lib.memhack");
const { preTick, reconcileTraffic } = require("./utils.movement");
require("./service.market");
require("./prototype.init"); // Initialize prototypes once
const ControllerGame = require("./controller.game");
const cpuAnalyzer = require("./service.cpu");
const utilsConsole = require("./utils.console");
const { validateCreepConfigs } = require("./utils.creeps");

// Validate creep configs once per global reset
validateCreepConfigs();

// Drop legacy Traveler memory once after switch
if (Memory.Traveler) {
  delete Memory.Traveler;
}

module.exports.loop = function () {
  // Run memhack first to optimize memory access for the entire tick
  memHack.run();

  const gc = new ControllerGame();

  // Check CPU bucket and skip tick if necessary
  // Skip before preTick so we don't clear intents without reconciling
  if (gc.checkCpuBucket()) {
    return;
  }

  // Cartographer: clear per-tick move intents / caches
  preTick();

  gc.processRooms();

  // Cartographer traffic: resolve conflicts and execute moves
  // Must run before expensive work that might exhaust the bucket
  reconcileTraffic();

  // Generate pixel if bucket is full (costs 10000 bucket)
  if (Game.cpu.bucket > CONSTANTS.CPU.PIXEL_GENERATION_THRESHOLD) {
    Game.cpu.generatePixel();
  }

  // Record CPU metrics for analysis
  cpuAnalyzer.recordTick();

  // Redraw scout visualization if enabled (persists for multiple ticks)
  utilsConsole._redrawScoutVisualization();

  // stats.doStats();
};
