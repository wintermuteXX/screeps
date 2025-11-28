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

// profiler.enable();

module.exports.loop = function () {
  // Run memhack first to optimize memory access for the entire tick
  memHack.run();
  
  profiler.wrap(function () {
    // Main.js logic should go here.
    if (Game.cpu.bucket < CONSTANTS.CPU.BUCKET_CRITICAL) {
      if (Game.cpu.limit !== 0) {
        Log.error("Bucket sehr Niedrig. Abbruch " + Game.time + " " + Game.cpu.bucket, "Main");
      }
      return;
    }

    if (Game.time % CONSTANTS.TICKS.LOG_INTERVAL === 0) {
      Log.success(`------------------ ${Game.time} is running //  Bucket: ${Game.cpu.bucket}------------------`, "Main");
    }

    const gc = new ControllerGame();
    gc.processRooms();
  });
  
  if (Game.cpu.bucket > CONSTANTS.CPU.PIXEL_GENERATION_THRESHOLD) {
    Game.cpu.generatePixel();
  }
  // stats.doStats();
};

// DONE 1. Use new constants for filling and removing resources in Terminal + Storage
// DONE 2. Sell stuff in Terminal that is not needed globaly
// DONE 3. Start producing in factory
// LONGTERM 4. Activate Powercreeps and code autorenew (and ops if needed)
// DONE 5. Activate and use Powercreeps to set factory level and maintain it
// DONE 6. Distribute materials only needed in factory level > 0
// LONGTERM 7. Sell materials produced in factories when not needed
// LONGTERM 8. Boost upgrader8 creeps
// LONGTERM 9. spawn defenders if attacked
// LONGTERM 10. Allow creeps to transport more then 1 resource
// LONGTERM 11. New Task "recycle" for e.g. mineral miner
// LONGTERM 12. Remote Mining (there was a formula for calculation if RM makes sense)
// LONGTERM 13. Harvest Power
// LONGTERM 14. test attack behavior
// LONGTERM 15. log market transactions to console (manual/auto/compressed over time)
// OPTIMIZE merge GOTO_FLAG in one behavior
