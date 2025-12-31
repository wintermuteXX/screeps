const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const duneConfig = require("./config.dune");

const b = new Behavior("sign_controller");

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
  const {controller} = creep.room;
  if (!controller || controller.my) {
    return;
  }

  ensureRoomMemory(roomName);
  const roomMemory = Memory.rooms[roomName];
  if (roomMemory.controllerSigned === true) {
    return;
  }

  const randomMessage = duneConfig.DUNE_MESSAGES[Math.floor(Math.random() * duneConfig.DUNE_MESSAGES.length)];
  const signResult = creep.signController(controller, randomMessage);

  if (signResult === OK) {
    roomMemory.controllerSigned = true;
    Log.success(`✍️ ${creep} signed controller in ${creep.room} with: "${randomMessage}"`, "sign_controller");
  } else if (signResult === ERR_NOT_IN_RANGE) {
    // Use moveTo instead of travelTo to ensure we stay in the current room
    // travelTo can find paths outside the room even with maxRooms: 1
    const moveResult = creep.moveTo(controller, {
      visualizePathStyle: { stroke: "#ffffff", lineStyle: "dashed" },
      maxRooms: 1,
      reusePath: 5,
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
  const {controller} = creep.room;
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
      reusePath: 5,
    });
    return;
  }

  // Sign the controller
  signController(creep, roomName);
};

module.exports = b;

