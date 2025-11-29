const CONSTANTS = require("constants");

// Cache all requires at module load time (runs once on global reset)
const profiler = require("screeps-profiler");
const memHack = require("memhack");
require("Traveler"); // Attaches to Creep prototype
const Log = require("Log");
global.Log = Log;
const stats = require("ControllerStats");
require("marketCalculator");
require("_init"); // Initialize prototypes once
const ControllerGame = require("ControllerGame");
// Pushtest
// profiler.enable();

module.exports.loop = function () {
  // Run memhack first to optimize memory access for the entire tick
  memHack.run();
  
  profiler.wrap(function () {
    // Main.js logic should go here.
    if (Game.cpu.bucket < CONSTANTS.CPU.BUCKET_CRITICAL) {
      // Only warn if bucket is decreasing (not after generatePixel)
      const prevBucket = Memory.previousBucket || 0;
      const bucketDecreasing = Game.cpu.bucket < prevBucket;
      
      if (Game.cpu.limit !== 0 && bucketDecreasing) {
        const bucketDiff = Game.cpu.bucket - prevBucket;
        const diffStr = bucketDiff >= 0 ? `+${bucketDiff}` : `${bucketDiff}`;
        Log.error(`Bucket critically low and decreasing. Skipping tick. Bucket: ${prevBucket} → ${Game.cpu.bucket} (${diffStr})`, "Main");
      }
      
      Memory.previousBucket = Game.cpu.bucket;
      return;
    }

    if (Game.time % CONSTANTS.TICKS.LOG_INTERVAL === 0) {
      const prevBucket = Memory.previousBucket || Game.cpu.bucket;
      const bucketDiff = Game.cpu.bucket - prevBucket;
      const diffStr = bucketDiff >= 0 ? `+${bucketDiff}` : `${bucketDiff}`;
      Log.success(`------------------ Running //  Bucket: ${prevBucket} → ${Game.cpu.bucket} (${diffStr}) ------------------`, "Main");
    }

    const gc = new ControllerGame();
    gc.processRooms();
  });
  
  // Generate pixel if bucket is full (costs 10000 bucket)
  if (Game.cpu.bucket > CONSTANTS.CPU.PIXEL_GENERATION_THRESHOLD) {
    Game.cpu.generatePixel();
  }
  
  // Save bucket value for next tick (AFTER generatePixel to avoid false alerts)
  Memory.previousBucket = Game.cpu.bucket;
  // stats.doStats();
};

// TODO (LONGTERM):
// 1. Activate Powercreeps and code autorenew (and ops if needed)
// 2. Sell materials produced in factories when not needed
// 3. Boost upgrader creeps
// 4. Spawn defenders if attacked
// 5. Allow creeps to transport more than 1 resource
// 6. Remote Mining (there was a formula for calculation if RM makes sense)
// 7. Harvest Power
// 8. Test attack behavior
// 9. Log market transactions to console (manual/auto/compressed over time)
