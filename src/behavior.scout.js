const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const RoomPlanner = require("./service.planner");

class ScoutBehavior extends Behavior {
  constructor() {
    super("scout");
  }

  when(creep, rc) {
    // Scout is active only if there are still rooms to scout
    return creep.findUnvisitedRoom() !== null;
  }

  completed(creep, rc) {
    const roomName = creep.room.name;

    // Don't complete if current room still needs analysis
    if (Room.needsAnalysis(roomName)) {
      return false;
    }

    // Check if there are any more rooms to scout
    if (!creep.findUnvisitedRoom()) {
      const homeRoom = creep.memory.home;
      const isInHomeRoom = homeRoom && roomName === homeRoom;

      // Check if we've been in this room before (has lastCheck in memory)
      Room.ensureMemory(roomName);
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
  }

  work(creep, rc) {
    const roomName = creep.room.name;
    Room.ensureMemory(roomName);

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
    if (Room.isHostile(roomName)) {
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
    if (!isOnExitTile && Room.needsAnalysis(roomName)) {
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
      const nextRoom = creep.findUnvisitedRoom();
      if (nextRoom) {
        targetRoom = nextRoom.roomName;
        creep.memory.scoutTarget = targetRoom;
        Log.success(`🔍 ${creep} starting analysis journey to ${Game.rooms[targetRoom]} (${nextRoom.distance} hops away)`, "scout");
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
  }
}

module.exports = new ScoutBehavior();
