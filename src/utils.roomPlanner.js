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
    layoutGenerated: undefined,  // undefined = noch nicht geprüft, wird beim nächsten run() generiert
    plannedStructures: [],
  };

  Log.info(`Center for ${roomName} set to (${x}, ${y}). Layout will be regenerated on next run.`, "RoomPlanner");
}

/**
 * Lists orphaned structures (built but no longer in the layout)
 * Usage: plannerOrphaned('W1N1')
 * @param {string} roomName - Room name
 * @returns {string} JSON formatted string of orphaned structures
 */
function plannerOrphaned(roomName) {
  const room = Game.rooms[roomName];
  if (!room) {
    Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
    return JSON.stringify([]);
  }
  const planner = new RoomPlanner(room);
  const orphaned = planner._findOrphanedStructures();

  if (orphaned.length === 0) {
    Log.info(`No orphaned structures found in ${roomName}`, "RoomPlanner");
    return JSON.stringify([]);
  }

  // Structure type names for display
  const structureNames = {
    [STRUCTURE_SPAWN]: "Spawn",
    [STRUCTURE_EXTENSION]: "Extension",
    [STRUCTURE_TOWER]: "Tower",
    [STRUCTURE_STORAGE]: "Storage",
    [STRUCTURE_TERMINAL]: "Terminal",
    [STRUCTURE_FACTORY]: "Factory",
    [STRUCTURE_LAB]: "Lab",
    [STRUCTURE_LINK]: "Link",
    [STRUCTURE_OBSERVER]: "Observer",
    [STRUCTURE_POWER_SPAWN]: "PowerSpawn",
    [STRUCTURE_NUKER]: "Nuker",
    [STRUCTURE_ROAD]: "Road",
    [STRUCTURE_CONTAINER]: "Container",
  };

  // Convert to serializable format
  const serializableOrphaned = orphaned.map((orphan) => {
    const name = structureNames[orphan.structureType] || orphan.structureType;
    return {
      name: name,
      structureType: orphan.structureType,
      x: orphan.x,
      y: orphan.y,
      id: orphan.structure.id,
      destroyCommand: `Game.getObjectById('${orphan.structure.id}').destroy()`,
    };
  });

  Log.info(`Found ${orphaned.length} orphaned structure(s) in ${roomName}:`, "RoomPlanner");
  for (const orphan of serializableOrphaned) {
    Log.info(
      `  - ${orphan.name} at (${orphan.x}, ${orphan.y}) - ID: ${orphan.id} - Destroy with: ${orphan.destroyCommand}`,
      "RoomPlanner",
    );
  }

  // Return JSON formatted string
  const formatted = JSON.stringify(serializableOrphaned, null, 2);
  Log.info(`JSON output:`, "RoomPlanner");
  Log.info(formatted, "RoomPlanner");
  return formatted;
}

module.exports = {
  plannerVisualize,
  plannerStats,
  plannerReset,
  plannerRun,
  plannerSetCenter,
  plannerOrphaned,
};

