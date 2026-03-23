/**
 * Resolve STRUCTURE_LINK positions from RoomPlanner memory and room tiles.
 */

/**
 * @param {string} roomName
 * @param {string} identifier - e.g. source_link_0, controller_link
 * @returns {{ x: number, y: number } | null}
 */
function getPlannedLinkTile(roomName, identifier) {
  const roomMem = Memory.rooms[roomName];
  const list = roomMem && roomMem.planner && roomMem.planner.plannedStructures && roomMem.planner.plannedStructures.list;
  if (!list || !list.length) {
    return null;
  }
  const entry = _.find(list, (s) => s && s.specialIdentifier === identifier && s.structureType === STRUCTURE_LINK);
  if (!entry || entry.x === undefined || entry.y === undefined) {
    return null;
  }
  return { x: entry.x, y: entry.y };
}

/**
 * @param {Room} room
 * @param {number} x
 * @param {number} y
 * @returns {StructureLink | null}
 */
function getLinkStructureAt(room, x, y) {
  const pos = new RoomPosition(x, y, room.name);
  const structures = pos.lookFor(LOOK_STRUCTURES);
  const link = structures.find((s) => s.structureType === STRUCTURE_LINK);
  return link || null;
}

/**
 * Planner identifier for a source link (source_link_0, …).
 * @param {Source} source
 * @returns {string | null}
 */
function getSourceLinkPlannerIdentifier(source) {
  const room = Game.rooms[source.room.name];
  if (!room) {
    return null;
  }
  const sources = room.find(FIND_SOURCES);
  const idx = sources.findIndex((s) => s.id === source.id);
  if (idx < 0) {
    return null;
  }
  return `source_link_${idx}`;
}

/**
 * Legacy bunker core link before specialIdentifier "spawn_link" existed (priority 86, no identifier).
 * @param {string} roomName
 * @returns {{ x: number, y: number } | null}
 */
function getLegacyBunkerSpawnLinkTile(roomName) {
  const list = Memory.rooms[roomName] && Memory.rooms[roomName].planner && Memory.rooms[roomName].planner.plannedStructures && Memory.rooms[roomName].planner.plannedStructures.list;
  if (!list || !list.length) {
    return null;
  }
  const entry = _.find(
    list,
    (s) => s && s.structureType === STRUCTURE_LINK && s.priority === 86 && !s.specialIdentifier,
  );
  if (!entry || entry.x === undefined || entry.y === undefined) {
    return null;
  }
  return { x: entry.x, y: entry.y };
}

/**
 * Wenn Memory/Planner keinen Spawn-Link liefern: Link in Range 2 eines Spawns, der kein Source-Link ist.
 * Verhindert, dass der Bunker-Link fälschlich nur als Sender (Source-Nähe) läuft und nie Energy bekommt.
 * @param {Room} room
 * @returns {string | null}
 */
function inferSpawnLinkIdFromWorld(room) {
  const sourceLinkIds = new Set();
  for (const source of room.find(FIND_SOURCES)) {
    if (source.memory.linkID) {
      const stored = Game.getObjectById(source.memory.linkID);
      if (stored && stored.structureType === STRUCTURE_LINK) {
        sourceLinkIds.add(source.memory.linkID);
        continue;
      }
    }
    if (source.link) {
      sourceLinkIds.add(source.link.id);
    }
  }
  const links = room.find(FIND_MY_STRUCTURES, {
    filter: (s) => {
      return s.structureType === STRUCTURE_LINK;
    },
  });
  const spawns = room.find(FIND_MY_SPAWNS);
  let bestId = null;
  let bestRange = 999;
  for (const spawn of spawns) {
    for (const link of links) {
      if (sourceLinkIds.has(link.id)) {
        continue;
      }
      const range = link.pos.getRangeTo(spawn);
      if (range <= 2 && range < bestRange) {
        bestRange = range;
        bestId = link.id;
      }
    }
  }
  return bestId;
}

/**
 * Bunker “spawn” link ID: Memory.rooms[room].structures.spawnLinkID, then planner tile spawn_link.
 * @param {Room} room
 * @returns {string | null}
 */
function getSpawnLinkIdForRoom(room) {
  if (!room) {
    return null;
  }
  if (!Memory.rooms[room.name]) {
    Memory.rooms[room.name] = {};
  }
  if (!Memory.rooms[room.name].structures) {
    Memory.rooms[room.name].structures = {};
  }
  const mem = Memory.rooms[room.name].structures;
  if (mem.spawnLinkID) {
    const link = Game.getObjectById(mem.spawnLinkID);
    if (link && link.structureType === STRUCTURE_LINK) {
      return mem.spawnLinkID;
    }
    mem.spawnLinkID = null;
  }
  let tile = getPlannedLinkTile(room.name, "spawn_link");
  if (!tile) {
    tile = getLegacyBunkerSpawnLinkTile(room.name);
  }
  if (tile) {
    const found = getLinkStructureAt(room, tile.x, tile.y);
    if (found) {
      mem.spawnLinkID = found.id;
      return found.id;
    }
  }
  const inferred = inferSpawnLinkIdFromWorld(room);
  if (inferred) {
    mem.spawnLinkID = inferred;
    return inferred;
  }
  return null;
}

module.exports = {
  getPlannedLinkTile,
  getLinkStructureAt,
  getSourceLinkPlannerIdentifier,
  getLegacyBunkerSpawnLinkTile,
  inferSpawnLinkIdFromWorld,
  getSpawnLinkIdForRoom,
};
