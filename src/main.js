const CONSTANTS = require("./constants");

// Cache all requires at module load time (runs once on global reset)
const memHack = require("memhack");
require("Traveler"); // Attaches to Creep prototype
const Log = require("Log");
const stats = require("ControllerStats");
require("marketCalculator");
require("_init"); // Initialize prototypes once
const ControllerGame = require("ControllerGame");

module.exports.loop = function () {
  // Run memhack first to optimize memory access for the entire tick
  memHack.run();
  
  // Main.js logic
  if (Game.cpu.bucket < CONSTANTS.CPU.BUCKET_CRITICAL) {
    // Only warn if bucket is decreasing (not after generatePixel)
    const prevBucket = Memory.previousBucket || 0;
    const bucketDecreasing = (Game.cpu.bucket < prevBucket) && (prevBucket !== 10000);
    
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
  
  // Generate pixel if bucket is full (costs 10000 bucket)
  if (Game.cpu.bucket > CONSTANTS.CPU.PIXEL_GENERATION_THRESHOLD) {
    Game.cpu.generatePixel();
  }
  
  Memory.previousBucket = Game.cpu.bucket;
  // stats.doStats();
};