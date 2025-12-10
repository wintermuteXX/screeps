const Log = require("./lib.log");
const RoomPlanner = require("./service.planner");

/**
 * Visualizes the planned layout for a room
 * Usage: plannerVisualize('W1N1')
 * @param {string} roomName - Room name
 */
function plannerVisualize(roomName) {
  const room = Game.rooms[roomName];
  if (!room) {
    Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
    return;
  }
  const planner = new RoomPlanner(room);
  planner.visualize();
  Log.info(`Layout for ${roomName} visualized. Check the room!`, "RoomPlanner");
}

/**
 * Returns statistics about the planned layout
 * Usage: plannerStats('W1N1')
 * @param {string} roomName - Room name
 * @returns {Object|null} Statistics object or null
 */
function plannerStats(roomName) {
  const room = Game.rooms[roomName];
  if (!room) {
    Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
    return "Room not visible";
  }
  const planner = new RoomPlanner(room);
  const stats = planner.getStats();
  const formatted = JSON.stringify(stats, null, 2);
  Log.info(`RoomPlanner stats for ${roomName}:`, "RoomPlanner");
  Log.info(formatted, "RoomPlanner");
  return formatted; // Return formatted string instead of object
}

/**
 * Resets the layout for a room
 * Usage: plannerReset('W1N1')
 * @param {string} roomName - Room name
 */
function plannerReset(roomName) {
  const room = Game.rooms[roomName];
  if (!room) {
    Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
    return;
  }
  const planner = new RoomPlanner(room);
  planner.reset();
  Log.info(`Layout for ${roomName} has been reset`, "RoomPlanner");
}

/**
 * Runs the RoomPlanner manually
 * Usage: plannerRun('W1N1')
 * @param {string} roomName - Room name
 */
function plannerRun(roomName) {
  const room = Game.rooms[roomName];
  if (!room) {
    Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
    return;
  }
  const planner = new RoomPlanner(room);
  planner.run();
  Log.info(`RoomPlanner for ${roomName} executed`, "RoomPlanner");
}

/**
 * Manually sets the center for a room
 * Usage: plannerSetCenter('W1N1', 25, 25)
 * @param {string} roomName - Room name
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function plannerSetCenter(roomName, x, y) {
  if (!Memory.rooms) Memory.rooms = {};
  if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {};
  // Initialize or reset planner with all required properties
  Memory.rooms[roomName].planner = {
    centerX: x,
    centerY: y,
    layoutGenerated: false,
    plannedStructures: [],
  };
  
  Log.info(`Center for ${roomName} set to (${x}, ${y}). Layout will be regenerated on next run.`, "RoomPlanner");
}

module.exports = {
  plannerVisualize,
  plannerStats,
  plannerReset,
  plannerRun,
  plannerSetCenter
};

