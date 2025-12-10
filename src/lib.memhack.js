/**
 * MemHack - Memory optimization for Screeps
 * 
 * This prevents Screeps from re-parsing the memory JSON string on every tick
 * by maintaining a reference to the parsed memory object.
 * 
 * Usage:
 *   const memHack = require('memhack');
 *   memHack.run(); // Call at the start of your loop
 */
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

function MemHack() {
  this.memory = null;
}

MemHack.prototype.run = function() {
  // On first run or after global reset, get the parsed memory
  if (!this.memory) {
    this.memory = RawMemory._parsed || Memory;
  }
  
  // Delete the global Memory to prevent re-parsing
  delete global.Memory;
  
  // Reassign from our cached reference
  global.Memory = this.memory;
  RawMemory._parsed = this.memory;
  
  // Clean up dead creeps from memory
  this.cleanupCreeps();
  
  // Clean up old room memory periodically
  if (Game.time % CONSTANTS.TICKS.MEMHACK_CLEANUP_ROOMS === 0) {
    this.cleanupRooms();
  }
  
  // Clean up structure memory periodically
  if (Game.time % CONSTANTS.TICKS.MEMHACK_CLEANUP_STRUCTURES === 0) {
    this.cleanupStructures();
  }
};

MemHack.prototype.cleanupCreeps = function() {
  if (!Memory.creeps) return;
  
  let cleaned = 0;
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
      cleaned++;
    }
  }
  
  if (cleaned > 0 && Game.time % CONSTANTS.TICKS.LOG_INTERVAL === 0) {
    Log.info(`Cleaned up ${cleaned} dead creep memories`, "MemHack");
  }
};

MemHack.prototype.cleanupRooms = function() {
  if (!Memory.rooms) return;
  
  const expireTime = Game.time - CONSTANTS.TICKS.ROOM_EXPIRE_TIME;
  let cleaned = 0;
  
  for (const roomName in Memory.rooms) {
    const roomMem = Memory.rooms[roomName];
    // Clean up rooms that haven't been checked in 30k ticks
    if (roomMem.lastCheck && roomMem.lastCheck < expireTime) {
      // Only delete if we don't own the room
      const room = Game.rooms[roomName];
      if (!room || !room.controller || !room.controller.my) {
        delete Memory.rooms[roomName];
        cleaned++;
      }
    }
  }
  
  if (cleaned > 0) {
    Log.info(`Cleaned up ${cleaned} old room memories`, "MemHack");
  }
};

MemHack.prototype.cleanupStructures = function() {
  // Clean up structure memory if it exists
  if (!Memory.structures) return;
  
  let cleaned = 0;
  for (const id in Memory.structures) {
    if (!Game.getObjectById(id)) {
      delete Memory.structures[id];
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    Log.info(`Cleaned up ${cleaned} dead structure memories`, "MemHack");
  }
};

// Export singleton instance
module.exports = new MemHack();

