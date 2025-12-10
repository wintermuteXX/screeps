const Behavior = require("./behavior.base");
const Log = require("./lib.log");

const b = new Behavior("sign_controller");

// Dune-inspired messages for controller signing
const DUNE_MESSAGES = [
  "The spice must flow... and so must information. Room analyzed.",
  "I must not fear. Fear is the mind-killer. This room has been scouted.",
  "The sleeper has awakened. Your room has been mapped.",
  "He who controls the spice controls the universe. I control the data now.",
  "Walk without rhythm, and you won't attract the worm. Room scouted silently.",
  "Bless the Maker and His water. This room has been blessed with analysis.",
  "A beginning is a very delicate time. This room's beginning has been documented.",
  "The mystery of life isn't a problem to solve, but a reality to experience. Room experienced.",
  "I see plans within plans. Your room is part of a greater plan.",
  "The power to destroy a thing is the absolute control over it. I control this room's data.",
  "Without change something sleeps inside us. This room has been awakened.",
  "The Fremen have a saying: 'God created Arrakis to train the faithful.' This room trains scouts.",
  "The spice extends life. The spice expands consciousness. This room expands knowledge.",
  "The voice of the people is the voice of God. The voice of this room has been heard.",
  "Muad'Dib has passed through here. Room scouted and analyzed.",
  "The desert takes the weak. This room has been claimed by the strong.",
  "Shai-Hulud watches. This room has been observed.",
  "Water is life. Data is power. This room's data has been collected.",
  "The Litany Against Fear has been recited. This room is no longer unknown.",
  "House Atreides sends its regards. Room intelligence gathered."
];

/**
 * Ensures Memory.rooms[roomName] exists and is initialized
 * @param {string} roomName - Name of the room
 */
function ensureRoomMemory(roomName) {
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[roomName]) {
    Memory.rooms[roomName] = {};
  }
}

/**
 * Attempts to sign the controller with a Dune-inspired message
 * @param {Creep} creep - The creep
 * @param {string} roomName - Name of the room
 */
function signController(creep, roomName) {
  const controller = creep.room.controller;
  if (!controller || controller.my) {
    return;
  }
  
  ensureRoomMemory(roomName);
  const roomMemory = Memory.rooms[roomName];
  if (roomMemory.controllerSigned === true) {
    return;
  }
  
  const randomMessage = DUNE_MESSAGES[Math.floor(Math.random() * DUNE_MESSAGES.length)];
  const signResult = creep.signController(controller, randomMessage);
  
  if (signResult === OK) {
    roomMemory.controllerSigned = true;
    Log.success(`✍️ ${creep} signed controller in ${roomName} with: "${randomMessage}"`, "sign_controller");
  } else if (signResult === ERR_NOT_IN_RANGE) {
    // Use moveTo instead of travelTo to ensure we stay in the current room
    // travelTo can find paths outside the room even with maxRooms: 1
    const moveResult = creep.moveTo(controller, {
      visualizePathStyle: { stroke: '#ffffff', lineStyle: 'dashed' },
      maxRooms: 1,
      reusePath: 5
    });
    
    // If pathfinding fails, mark as signed to avoid getting stuck
    if (moveResult !== OK && moveResult !== ERR_TIRED && moveResult !== ERR_NO_PATH) {
      roomMemory.controllerSigned = true;
      Log.warn(`⚠️ ${creep} cannot reach controller in ${roomName} (pathfinding error: ${global.getErrorString(moveResult)}), marking as signed`, "sign_controller");
    } else if (moveResult === ERR_NO_PATH) {
      // If no path exists, mark as signed to avoid infinite retries
      roomMemory.controllerSigned = true;
      Log.warn(`⚠️ ${creep} no path to controller in ${roomName}, marking as signed`, "sign_controller");
    }
  }
}

b.when = function (creep, rc) {
  // Only sign controllers in rooms that have been analyzed but not yet signed
  const roomName = creep.room.name;
  ensureRoomMemory(roomName);
  const roomMemory = Memory.rooms[roomName];
  
  // Check if room has been analyzed (has lastCheck) but controller not signed
  const hasBeenAnalyzed = roomMemory.lastCheck !== undefined;
  const needsSigning = roomMemory.controllerSigned !== true;
  
  // Only activate if room has been analyzed and controller needs signing
  if (!hasBeenAnalyzed || !needsSigning) {
    return false;
  }
  
  // Check if controller exists and is not ours
  const controller = creep.room.controller;
  if (!controller || controller.my) {
    return false;
  }
  
  return true;
};

b.completed = function (creep, rc) {
  const roomName = creep.room.name;
  ensureRoomMemory(roomName);
  const roomMemory = Memory.rooms[roomName];
  
  // Completed if controller is signed
  return roomMemory.controllerSigned === true;
};

b.work = function (creep, rc) {
  const roomName = creep.room.name;
  ensureRoomMemory(roomName);
  
  // Check if we're on an exit tile - move to center first
  const isOnExitTile = creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49;
  if (isOnExitTile) {
    const centerPos = new RoomPosition(25, 25, roomName);
    creep.moveTo(centerPos, {
      range: 20,
      maxRooms: 1,
      reusePath: 5
    });
    return;
  }
  
  // Sign the controller
  signController(creep, roomName);
};

module.exports = b;

