const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const RoomPlanner = require("./service.planner");

const b = new Behavior("scout");

/**
 * Checks if a room needs to be analyzed
 * @param {string} roomName - Name of the room to check
 * @returns {boolean} True if room needs analysis
 */
function needsAnalysis(roomName) {
  // Check Memory.rooms[roomName].lastCheck (works even without vision)
  if (Memory.rooms && Memory.rooms[roomName]) {
    const {lastCheck} = Memory.rooms[roomName];
    // Needs analysis if never checked or last check was more than 100000 ticks ago
    return !lastCheck || (Game.time - lastCheck > 100000);
  }

  // If no memory entry, we need to visit it
  return true;
}

/**
 * Ensures Memory.rooms[roomName] exists and is initialized (global memory)
 * @param {string} roomName - Name of the room
 */
function _ensureGlobalRoomMemory(roomName) {
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[roomName]) {
    Memory.rooms[roomName] = {};
  }
}

/**
 * Checks if a room is hostile and should be avoided
 * Uses multiple sources: Traveler memory, room memory, and direct controller check
 * @param {string} roomName - Name of the room to check
 * @returns {boolean} True if room should be avoided
 */
function isHostileRoom(roomName) {
  // 1. Check room memory (most reliable, updated by Traveler.updateRoomStatus)
  if (Memory.rooms && Memory.rooms[roomName]) {
    const roomMemory = Memory.rooms[roomName];
    if (roomMemory.avoid === 1 || roomMemory.isHostile === true) {
      return true;
    }
  }

  // 2. If we have vision, check controller directly and update memory
  const room = Game.rooms[roomName];
  if (room && room.controller) {
    _ensureGlobalRoomMemory(roomName);

    const myUsername = global.getMyUsername();
    const isHostile = (room.controller.owner && !room.controller.my) ||
                     (room.controller.reservation && myUsername && room.controller.reservation.username !== myUsername);

    // Update room memory (same logic as Traveler.updateRoomStatus)
    if (isHostile) {
      Memory.rooms[roomName].avoid = 1;
      Memory.rooms[roomName].isHostile = true;
    } else {
      delete Memory.rooms[roomName].avoid;
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
    if (roomStatus.status === "normal" &&
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
      if (level1Status.status === "normal" && !isHostileRoom(level1Room)) {
        const level1Exits = Game.map.describeExits(level1Room);
        for (const dir2 in level1Exits) {
          const roomName = level1Exits[dir2];
          const roomStatus = Game.map.getRoomStatus(roomName);
          const distFromStart = Game.map.getRoomLinearDistance(startRoom, roomName);
          // Don't go back to current room and max 2 hops from start
          if (roomName !== currentRoom &&
              roomStatus.status === "normal" &&
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
  const roomName = creep.room.name;

  // Don't complete if current room still needs analysis
  if (needsAnalysis(roomName)) {
    return false;
  }

  // Check if there are any more rooms to scout
  if (!findUnvisitedRoom(creep)) {
    const homeRoom = creep.memory.home;
    const isInHomeRoom = homeRoom && roomName === homeRoom;

    // Check if we've been in this room before (has lastCheck in memory)
    _ensureGlobalRoomMemory(roomName);
    const roomMemory = Memory.rooms[roomName];
    const hasBeenInRoom = creep.memory.lastRoom === roomName && roomMemory.lastCheck !== undefined;

    if (isInHomeRoom || hasBeenInRoom) {
      if (!creep.memory.scoutCompleted) {
        Log.success(`✅ ${creep} completed scouting - no more rooms to analyze within 2 hops`, "scout");
        creep.memory.scoutCompleted = true;
      }
      return true;
    }
  }

  return false;
};

b.work = function (creep, rc) {
  const roomName = creep.room.name;
  _ensureGlobalRoomMemory(roomName);

  // Track current room for next tick
  const {lastRoom} = creep.memory;
  const justEnteredRoom = lastRoom !== roomName;
  creep.memory.lastRoom = roomName;

  // CRITICAL: Prevent blinking - if we just entered a room or are on an exit tile, move into the room center first
  const isOnExitTile = creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49;
  if (justEnteredRoom || isOnExitTile) {
    // Move to center of room to get off exit tile immediately
    const centerPos = new RoomPosition(25, 25, roomName);
    const moveResult = creep.travelTo(centerPos, {
      range: 20,  // Move within 20 tiles of center (away from exit tiles)
      maxRooms: 1,
      preferHighway: false,  // Don't use highways when moving within room
      ignoreConstructionSites: true,
    });

    // If we just entered and are moving, don't do other logic this tick
    if (justEnteredRoom && moveResult === OK) {
      return;
    }
  }

  // Safety check: If we entered a hostile room, immediately leave
  if (isHostileRoom(roomName)) {
    Log.warn(`⚠️ ${creep} entered hostile room ${creep.room}, retreating!`, "scout");
    const homeRoom = creep.memory.home;
    if (homeRoom && homeRoom !== creep.room.name) {
      creep.memory.scoutTarget = homeRoom;
      creep.travelTo(new RoomPosition(25, 25, homeRoom), {
        preferHighway: true,
        ensurePath: true,
        useFindRoute: true,
        ignoreConstructionSites: true,
      });
      return;
    }
  }

  // Analyze room if it needs analysis (only if we're not on exit tile)
  if (!isOnExitTile && needsAnalysis(roomName)) {
    Log.success(`🔍 ${creep} Analyzing room ${roomName}`, "scout");
    global.analyzeRoom(creep.room, true);
    
    // Versuche Layout zu generieren wenn Raum gerade betreten wurde
    if (justEnteredRoom) {
      try {
        const planner = new RoomPlanner(creep.room);
        const layoutGenerated = planner.tryGenerateLayout();
        if (layoutGenerated) {
          Log.success(`✅ ${creep} Layout für ${roomName} erfolgreich generiert`, "scout");
        } else {
          Log.warn(`⚠️ ${creep} Layout-Generierung für ${roomName} fehlgeschlagen`, "scout");
        }
      } catch (error) {
        Log.error(`❌ ${creep} Fehler bei Layout-Generierung für ${roomName}: ${error}`, "scout");
      }
    }
  }

  // Determine target room
  let targetRoom = creep.memory.scoutTarget;

  // Update target if we've reached it or don't have one
  if (!targetRoom || targetRoom === creep.room.name) {
    const nextRoom = findUnvisitedRoom(creep);
    if (nextRoom) {
      targetRoom = nextRoom.roomName;
      creep.memory.scoutTarget = targetRoom;
      Log.success(`🔍 ${creep} starting analysis journey to ${targetRoom} (${nextRoom.distance} hops away)`, "scout");
    } else {
      // No more unvisited rooms - return to home room
      const homeRoom = creep.memory.home;
      if (homeRoom && homeRoom !== creep.room.name) {
        targetRoom = homeRoom;
        creep.memory.scoutTarget = targetRoom;
      } else {
        // Already at home and no more rooms to scout
        return;
      }
    }
  }

  // Move to target room (only if we're not on exit tile)
  if (!isOnExitTile && targetRoom !== creep.room.name) {
    creep.travelTo(new RoomPosition(25, 25, targetRoom), {
      preferHighway: true,
      ensurePath: true,
      useFindRoute: true,
      ignoreConstructionSites: true,
    });
  }
};

module.exports = b;
module.exports.findUnvisitedRoom = findUnvisitedRoom;
