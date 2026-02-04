const ControllerRoom = require("./controller.room");
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");
const cpuAnalyzer = require("./service.cpu");

class ControllerGame {
  constructor() {
    // Garbage collection is now handled by memhack.js
    // This reduces duplicate work and improves performance

    this._rooms = {};
    for (const r in Game.rooms) {
      const room = Game.rooms[r];
      this._rooms[room.name] = new ControllerRoom(room, this);
    }
  }

  /**
   * Manages CPU bucket monitoring and tick skipping logic
   * @returns {boolean} Returns true if tick should be skipped, false otherwise
   */
  checkCpuBucket() {
    // Get previous bucket from cpuHistory
    const prevBucket = cpuAnalyzer.getPreviousBucket();

    if (Game.cpu.bucket < CONSTANTS.CPU.BUCKET_CRITICAL) {
      // Only warn if bucket is decreasing (not after generatePixel)
      const bucketDecreasing = (Game.cpu.bucket < prevBucket) && (prevBucket !== 10000);

      if (Game.cpu.limit !== 0 && bucketDecreasing) {
        const bucketDiff = Game.cpu.bucket - prevBucket;
        const diffStr = bucketDiff >= 0 ? `+${bucketDiff}` : `${bucketDiff}`;
        Log.error(`Bucket critically low and decreasing. Skipping tick. Bucket: ${prevBucket} → ${Game.cpu.bucket} (${diffStr})`, "Main");
      }

      return true; // Skip tick
    }

    if (Game.time % CONSTANTS.TICKS.LOG_INTERVAL === 0) {
      const bucketDiff = Game.cpu.bucket - prevBucket;
      const diffStr = bucketDiff >= 0 ? `+${bucketDiff}` : `${bucketDiff}`;
      Log.success(`------------------ Running //  Bucket: ${prevBucket} → ${Game.cpu.bucket} (${diffStr}) ------------------`, "Main");
    }

    return false; // Continue with tick
  }

  /**
   * Find the best room to claim and set Memory.roomToClaim
   * Runs every 100 ticks
   */
  findBestRoomForClaiming() {
    // Only run if roomToClaim is not already set
    if (Memory.roomToClaim) {
      return;
    }

    // Check CPU analysis
    const decision = cpuAnalyzer.canConquerNewRoom();
    if (!decision.canConquer) {
      return;
    }

    // Find the highest scored room that is not yet claimed
    if (!Memory.rooms) {
      return;
    }

    let bestRoom = null;
    let bestScore = -1;

    for (const roomName in Memory.rooms) {
      const roomMemory = Memory.rooms[roomName];

      // Check if room has a score
      if (!roomMemory.score || !roomMemory.score.total) {
        continue;
      }

      // Check if room is valid for claiming
      if (!Room.isRoomValidForClaiming(roomName)) {
        continue;
      }

      // Check if score is higher than current best
      if (roomMemory.score.total > bestScore) {
        bestScore = roomMemory.score.total;
        bestRoom = roomName;
      }
    }

    // If a suitable room was found, set roomToClaim
    if (bestRoom) {
      Memory.roomToClaim = bestRoom;
    }
  }

  processRooms() {
    // Find best room for claiming periodically (every 100 ticks)
    if (Game.time % CONSTANTS.TICKS.FIND_CLAIM_ROOM === 0) {
      this.findBestRoomForClaiming();
    }

    // Reset internal-trade "already sent" map so only one terminal sends per (resource, targetRoom) per tick
    if (Game.time % CONSTANTS.TICKS.INTERNAL_TRADE === 0) {
      Memory.internalTradeSent = {};
    }

    for (const i in this._rooms) {
      this._rooms[i].run();
    }
  }
}

module.exports = ControllerGame;
