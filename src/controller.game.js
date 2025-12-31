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
   * Updates the previous bucket value in memory
   * Note: This is now handled automatically by cpuAnalyzer.recordTick()
   * This method is kept for compatibility but does nothing.
   */
  updateBucketMemory() {
    // Bucket is now stored in Memory.cpuHistory via cpuAnalyzer.recordTick()
    // No need to update Memory.previousBucket anymore
  }

  /**
   * Findet den besten Raum für Claiming und setzt Memory.roomToClaim
   * Wird zyklisch alle 100 Ticks ausgeführt
   */
  findBestRoomForClaiming() {
    // Nur ausführen wenn roomToClaim nicht bereits gesetzt ist
    if (Memory.roomToClaim) {
      return;
    }

    // Prüfe CPU-Analyse
    const decision = cpuAnalyzer.canConquerNewRoom();
    if (!decision.canConquer) {
      return;
    }

    // Finde den Raum mit der höchsten Bewertung, der noch nicht geclaimt ist
    if (!Memory.rooms) {
      return;
    }

    let bestRoom = null;
    let bestScore = -1;

    for (const roomName in Memory.rooms) {
      const roomMemory = Memory.rooms[roomName];

      // Prüfe ob Raum einen Score hat
      if (!roomMemory.score || !roomMemory.score.total) {
        continue;
      }

      // Prüfe ob Raum für Claiming geeignet ist
      if (!Room.isRoomValidForClaiming(roomName)) {
        continue;
      }

      // Prüfe ob Score höher ist als bisheriger bester Score
      if (roomMemory.score.total > bestScore) {
        bestScore = roomMemory.score.total;
        bestRoom = roomName;
      }
    }

    // Wenn ein geeigneter Raum gefunden wurde, setze roomToClaim
    if (bestRoom) {
      Memory.roomToClaim = bestRoom;
    }
  }

  processRooms() {
    // Finde besten Raum für Claiming zyklisch (alle 100 Ticks)
    if (Game.time % CONSTANTS.TICKS.FIND_CLAIM_ROOM === 0) {
      this.findBestRoomForClaiming();
    }

    for (const i in this._rooms) {
      this._rooms[i].run();
    }
  }
}

module.exports = ControllerGame;
