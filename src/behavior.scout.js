const Behavior = require("_behavior");
const Log = require("Log");

const b = new Behavior("scout");

/**
 * Checks if a room needs to be analyzed
 * @param {string} roomName - Name of the room to check
 * @returns {boolean} True if room needs analysis
 */
function needsAnalysis(roomName) {
  // Check Memory.rooms[roomName].lastCheck (works even without vision)
  if (Memory.rooms && Memory.rooms[roomName]) {
    const lastCheck = Memory.rooms[roomName].lastCheck;
    // Needs analysis if never checked or last check was more than 100000 ticks ago
    return !lastCheck || (Game.time - lastCheck > 100000);
  }
  
  // If no memory entry, we need to visit it
  return true;
}

/**
 * Checks if a room is hostile and should be avoided
 * Uses multiple sources: Traveler memory, room memory, and direct controller check
 * @param {string} roomName - Name of the room to check
 * @returns {boolean} True if room should be avoided
 */
function isHostileRoom(roomName) {
  // 1. Check Traveler memory (most reliable, updated by Traveler.updateRoomStatus)
  if (Memory.Traveler && Memory.Traveler.rooms && Memory.Traveler.rooms[roomName]) {
    if (Memory.Traveler.rooms[roomName].avoid === 1) {
      return true;
    }
  }
  
  // 2. Check room memory (from previous analysis)
  if (Memory.rooms && Memory.rooms[roomName]) {
    const roomMemory = Memory.rooms[roomName];
    // If we previously marked it as hostile
    if (roomMemory.isHostile === true) {
      return true;
    }
  }
  
  // 3. If we have vision, check controller directly and update Traveler
  const room = Game.rooms[roomName];
  if (room && room.controller) {
    // Update Traveler memory (same logic as Traveler.updateRoomStatus)
    if (!Memory.Traveler) {
      Memory.Traveler = {};
    }
    if (!Memory.Traveler.rooms) {
      Memory.Traveler.rooms = {};
    }
    if (!Memory.Traveler.rooms[roomName]) {
      Memory.Traveler.rooms[roomName] = {};
    }
    
    const myUsername = global.getMyUsername();
    const isHostile = (room.controller.owner && !room.controller.my) || 
                     (room.controller.reservation && myUsername && room.controller.reservation.username !== myUsername);
    
    // Update Traveler memory
    if (isHostile) {
      Memory.Traveler.rooms[roomName].avoid = 1;
    } else {
      delete Memory.Traveler.rooms[roomName].avoid;
    }
    
    // Also update room memory for future reference
    if (isHostile && Memory.rooms && Memory.rooms[roomName]) {
      Memory.rooms[roomName].isHostile = true;
    }
    
    return isHostile;
  }
  
  return false;
}

/**
 * Finds an unvisited room within 2 hops from the start room that needs analysis
 */
function findUnvisitedRoom(creep) {
  const currentRoom = creep.room.name;
  
  // Find start room (home room from memory, fallback to current room)
  const startRoom = creep.memory.home || currentRoom;
  
  // Calculate distance from start room
  const distanceFromStart = Game.map.getRoomLinearDistance(startRoom, currentRoom);
  
  const candidates = [];
  
  // Get exits from current room
  const exits = Game.map.describeExits(currentRoom);
  
  // Level 1: Directly adjacent rooms (max 1 hop from start)
  for (const direction in exits) {
    const roomName = exits[direction];
    const roomStatus = Game.map.getRoomStatus(roomName);
    const distFromStart = Game.map.getRoomLinearDistance(startRoom, roomName);
    
    // Check if room is normal AND not hostile AND needs analysis
    if (roomStatus.status === 'normal' && 
        distFromStart <= 2 && 
        !isHostileRoom(roomName) && 
        needsAnalysis(roomName)) {
      candidates.push({ roomName, distance: distFromStart });
    }
  }
  
  // Level 2: Rooms 2 hops from start (only if no Level-1 rooms found)
  if (candidates.length === 0 && distanceFromStart < 2) {
    for (const direction in exits) {
      const level1Room = exits[direction];
      const level1Status = Game.map.getRoomStatus(level1Room);
      if (level1Status.status === 'normal' && !isHostileRoom(level1Room)) {
        const level1Exits = Game.map.describeExits(level1Room);
        for (const dir2 in level1Exits) {
          const roomName = level1Exits[dir2];
          const roomStatus = Game.map.getRoomStatus(roomName);
          const distFromStart = Game.map.getRoomLinearDistance(startRoom, roomName);
          // Don't go back to current room and max 2 hops from start
          if (roomName !== currentRoom && 
              roomStatus.status === 'normal' && 
              distFromStart <= 2 && 
              !isHostileRoom(roomName) && 
              needsAnalysis(roomName)) {
            candidates.push({ roomName, distance: distFromStart });
          }
        }
      }
    }
  }
  
  if (candidates.length > 0) {
    // Sort by distance (closest first) and randomly choose from the closest
    candidates.sort((a, b) => a.distance - b.distance);
    const minDist = candidates[0].distance;
    const closestCandidates = candidates.filter(c => c.distance === minDist);
    return closestCandidates[Math.floor(Math.random() * closestCandidates.length)];
  }
  
  return null;
}


b.when = function (creep, rc) {
  // Scout is active only if there are still rooms to scout
  return findUnvisitedRoom(creep) !== null;
};

b.completed = function (creep, rc) {
  // Check if there are any more rooms to scout
  if (!findUnvisitedRoom(creep)) {
    Log.success(`✅ Scout ${creep.name} completed scouting - no more rooms to analyze within 2 hops`, "scout");
    creep.memory.scoutCompleted = true;
    return true;
  }
  return false;
};

b.work = function (creep, rc) {
  // Mark current room as visited
  const roomName = creep.room.name;
  
  // Safety check: If we entered a hostile room, immediately leave
  if (isHostileRoom(roomName)) {
    Log.warn(`⚠️ Scout ${creep.name} entered hostile room ${roomName}, retreating!`, "scout");
    const homeRoom = creep.memory.home;
    if (homeRoom && homeRoom !== creep.room.name) {
      creep.memory.scoutTarget = homeRoom;
      const targetPos = new RoomPosition(25, 25, homeRoom);
      creep.travelTo(targetPos, {
        preferHighway: true,
        ensurePath: true,
        useFindRoute: true,
      });
      return;
    }
  }
  
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[roomName]) {
    Memory.rooms[roomName] = {};
  }
  
  // Set lastCheck when scout enters room (before analysis)
  const lastCheck = Memory.rooms[roomName].lastCheck;
  Memory.rooms[roomName].lastCheck = Game.time;
  
  // Analyze current room only if:
  // 1. Scout just entered this room (wasn't here last tick), or
  // 2. Room needs analysis (never checked or last check was more than 100000 ticks ago)
  const shouldAnalyze = !lastCheck || 
                        lastCheck < Game.time - 1 || 
                        needsAnalysis(roomName);
  
  if (shouldAnalyze) {
    global.analyzeRoom(creep.room, true);
  }
  
  // Check if we have a target
  let targetRoom = creep.memory.scoutTarget;
  
  // If no target or target already reached
  if (!targetRoom || targetRoom === creep.room.name) {
    const nextRoom = findUnvisitedRoom(creep);
    if (nextRoom) {
      targetRoom = nextRoom.roomName;
      creep.memory.scoutTarget = targetRoom;
      Log.success(`🔍 Scout ${creep.name} starting analysis journey to ${targetRoom} (${nextRoom.distance} hops away)`, "scout");
    } else {
      // No more unvisited rooms within 2 hops - return to home room
      const homeRoom = creep.memory.home;
      if (homeRoom && homeRoom !== creep.room.name) {
        targetRoom = homeRoom;
        creep.memory.scoutTarget = targetRoom;
        Log.debug(`Scout ${creep.name} returning to home room ${homeRoom}`, "scout");
      } else {
        // Already in home room or no home room set - wait
        return;
      }
    }
  }
  
  // Move to target room
  if (targetRoom !== creep.room.name) {
    // Use travelTo with RoomPosition in target room - Traveler will handle room transitions
    const targetPos = new RoomPosition(25, 25, targetRoom);
    creep.travelTo(targetPos, {
      preferHighway: true,
      ensurePath: true,
      useFindRoute: true,
    });
  }
};

module.exports = b;
module.exports.findUnvisitedRoom = findUnvisitedRoom;

