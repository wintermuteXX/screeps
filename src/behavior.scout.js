const Behavior = require("_behavior");
const Log = require("Log");

const b = new Behavior("scout");

/**
 * Checks if a room needs to be analyzed
 * @param {string} roomName - Name of the room to check
 * @returns {boolean} True if room needs analysis
 */
function needsAnalysis(roomName) {
  const room = Game.rooms[roomName];
  
  // If we have vision, check room.memory
  if (room && room.memory) {
    const lastCheck = room.memory.lastCheck;
    // Needs analysis if never checked or last check was more than 100000 ticks ago
    return !lastCheck || (Game.time - lastCheck > 100000);
  }
  
  // If no vision, we need to visit it
  return true;
}

/**
 * Checks if a room has been visited by scout
 */
function hasBeenVisited(roomName) {
  if (!Memory.rooms || !Memory.rooms[roomName]) {
    return false;
  }
  return Memory.rooms[roomName].scoutVisited !== undefined;
}

/**
 * Finds an unvisited room within 2 hops from the start room that needs analysis
 */
function findUnvisitedRoom(creep) {
  const currentRoom = creep.room.name;
  
  // Find start room (spawn room)
  const spawns = Object.keys(Game.spawns);
  const startRoom = spawns.length > 0 ? Game.spawns[spawns[0]].room.name : currentRoom;
  
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
    if (roomStatus.status === 'normal' && distFromStart <= 2 && needsAnalysis(roomName) && !hasBeenVisited(roomName)) {
      candidates.push({ roomName, distance: distFromStart });
    }
  }
  
  // Level 2: Rooms 2 hops from start (only if no Level-1 rooms found)
  if (candidates.length === 0 && distanceFromStart < 2) {
    for (const direction in exits) {
      const level1Room = exits[direction];
      const level1Status = Game.map.getRoomStatus(level1Room);
      if (level1Status.status === 'normal') {
        const level1Exits = Game.map.describeExits(level1Room);
        for (const dir2 in level1Exits) {
          const roomName = level1Exits[dir2];
          const roomStatus = Game.map.getRoomStatus(roomName);
          const distFromStart = Game.map.getRoomLinearDistance(startRoom, roomName);
          // Don't go back to current room and max 2 hops from start
          if (roomName !== currentRoom && roomStatus.status === 'normal' && 
              distFromStart <= 2 && needsAnalysis(roomName) && !hasBeenVisited(roomName)) {
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
  // Scout should always be active
  return true;
};

b.completed = function (creep, rc) {
  // Never completed - scout runs continuously
  return false;
};

b.work = function (creep, rc) {
  // Mark current room as visited
  const roomName = creep.room.name;
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[roomName]) {
    Memory.rooms[roomName] = {};
  }
  Memory.rooms[roomName].scoutVisited = Game.time;
  
  // Analyze current room
  global.analyzeRoom(creep.room, true);
  
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
      // No more unvisited rooms within 2 hops - return to spawn room
      const spawns = Object.keys(Game.spawns);
      if (spawns.length > 0) {
        const spawnRoom = Game.spawns[spawns[0]].room.name;
        if (spawnRoom !== creep.room.name) {
          targetRoom = spawnRoom;
          creep.memory.scoutTarget = targetRoom;
          Log.debug(`Scout ${creep.name} returning to spawn room ${spawnRoom}`, "scout");
        } else {
          // Already in spawn room - wait
          return;
        }
      } else {
        // No spawn found - stay in current room
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

