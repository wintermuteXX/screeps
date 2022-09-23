if (Game.cpu.bucket < 100) {
  throw new Error("Der Bucket ist fast leer. Ich setze mal einen Tick aus...");
}

var profiler = require("screeps-profiler");
var Traveler = require("Traveler");
global.Log = require("Log");
var stats = require("ControllerStats");
const Log = require("Log");
require("marketCalculator");

// profiler.enable();

module.exports.loop = function () {
  profiler.wrap(function () {
    // Main.js logic should go here.
    if (Game.cpu.bucket < 100) {
      if (Game.cpu.limit !== 0) {
        Log.error("Bucket sehr Niedrig. Abbruch " + Game.time + " " + Game.cpu.bucket, "Main");
      }
      return;
    }

    require("_init");
    if (Game.time % 100 === 0) {
      Log.success(`------------------ ${Game.time} is running //  Bucket: ${Game.cpu.bucket}------------------`, "Main");
    }

    var ControllerGame = require("ControllerGame");
    var gc = new ControllerGame();
    gc.processRooms();
  });
  if (Game.cpu.bucket > 9999) {
    Game.cpu.generatePixel();
  }
  // stats.doStats();
};

// DONE 1. Use new constants for filling and removing resources in Terminal + Storage
// LONGTERM 2. Sell stuff in Terminal that is not needed globaly
// DONE 3. Start producing in factory
// LONGTERM 4. Activate Powercreeps and code autorenew (and ops if needed)
// LONGTERM 5. Activate and use Powercreeps to set factory level and maintain it
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
