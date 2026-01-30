const Log = require("./lib.log");
const CONSTANTS = require("./config.constants");


/**
 * Calculates a score for a room based on various factors
 * Higher score = better room for claiming
 * @param {Room} room - The room to score
 * @param {Object} memory - The room's memory
 * @returns {Object} Score object with total and breakdown
 */
function calculateRoomScore(room, memory) {
  let score = 0;
  const breakdown = {};

  // 0. Check if room has a controller - no controller = 0 points
  const hasController = (room && room.controller) || (memory.controller !== undefined);
  if (!hasController) {
    // Room has no controller - return 0 points
    return {
      total: 0,
      breakdown: {
        isFree: 0,
        hasTwoSources: 0,
        lowSwamp: 0,
        highFreeSpace: 0,
        newMineral: 0,
      },
    };
  }

  // 1. Is the room free? (highest priority - 1000 points)
  // Only check if controller exists (already verified above)
  const isFree = memory.controller &&
                 (!memory.controller.owner && !memory.controller.reservation);
  if (isFree) {
    score += 1000;
    breakdown.isFree = 1000;
  } else {
    breakdown.isFree = 0;
  }

  // 2. Has 2 sources? (500 points)
  if (memory.sources && memory.sources.length === 2) {
    score += 500;
    breakdown.hasTwoSources = 500;
  } else {
    breakdown.hasTwoSources = 0;
  }

  // 3. Little swamp in room? (max 300 points, less swamp = more points)
  const terrain = Game.map.getRoomTerrain(room.name);
  let swampCount = 0;
  let freeSpaceCount = 0;
  const totalTiles = 50 * 50; // Room is 50x50

  for (let x = 0; x < 50; x++) {
    for (let y = 0; y < 50; y++) {
      const terrainType = terrain.get(x, y);
      if (terrainType === TERRAIN_MASK_SWAMP) {
        swampCount++;
      } else if (terrainType !== TERRAIN_MASK_WALL) {
        freeSpaceCount++;
      }
    }
  }

  const swampPercentage = (swampCount / totalTiles) * 100;
  // Less swamp = more points (0% swamp = 300 points, 50% swamp = 0 points)
  const swampScore = Math.max(0, 300 * (1 - swampPercentage / 50));
  score += swampScore;
  breakdown.lowSwamp = Math.round(swampScore);
  breakdown.swampPercentage = Math.round(swampPercentage * 10) / 10;

  // 4. Much free space in room? (max 200 points, more space = more points)
  const freeSpacePercentage = (freeSpaceCount / totalTiles) * 100;
  // More free space = more points (100% free = 200 points, 50% free = 0 points)
  const freeSpaceScore = Math.max(0, 200 * ((freeSpacePercentage - 50) / 50));
  score += freeSpaceScore;
  breakdown.highFreeSpace = Math.round(freeSpaceScore);
  breakdown.freeSpacePercentage = Math.round(freeSpacePercentage * 10) / 10;

  // 5. Has a mineral we don't have in other rooms? (400 points)
  if (memory.mineral && memory.mineral.type) {
    const existingMinerals = new Set();

    // Check all rooms in memory for existing minerals
    if (Memory.rooms) {
      for (const roomName in Memory.rooms) {
        const roomMemory = Memory.rooms[roomName];
        // Only count rooms we own or have claimed
        // Use new structure: structures.controllers[controllerId]
        let controllerMemory = null;
        if (roomMemory.structures && roomMemory.structures.controllers) {
          const controllerIds = Object.keys(roomMemory.structures.controllers);
          if (controllerIds.length > 0) {
            controllerMemory = roomMemory.structures.controllers[controllerIds[0]];
          }
        }
        if (controllerMemory && controllerMemory.my) {
          // Use new structure: structures.minerals[mineralId]
          if (roomMemory.structures && roomMemory.structures.minerals) {
            const mineralIds = Object.keys(roomMemory.structures.minerals);
            if (mineralIds.length > 0) {
              const mineralMemory = roomMemory.structures.minerals[mineralIds[0]];
              if (mineralMemory && mineralMemory.type) {
                existingMinerals.add(mineralMemory.type);
              }
            }
          }
        }
      }
    }

    // Check current Game.rooms for owned rooms
    for (const roomName in Game.rooms) {
      const gameRoom = Game.rooms[roomName];
      if (gameRoom.controller && gameRoom.controller.my) {
        if (gameRoom.mineral) {
          existingMinerals.add(gameRoom.mineral.mineralType);
        }
      }
    }

    if (!existingMinerals.has(memory.mineral.type)) {
      score += 400;
      breakdown.newMineral = 400;
      breakdown.mineralType = memory.mineral.type;
    } else {
      breakdown.newMineral = 0;
      breakdown.mineralType = memory.mineral.type;
    }
  } else {
    breakdown.newMineral = 0;
  }

  return {
    total: Math.round(score),
    breakdown: breakdown,
  };
}

/**
 * Analyse a room and store comprehensive data in memory
 * Can be called from ControllerRoom or Scout
 * @param {Room} room - The room to analyse
 * @param {boolean} fullAnalysis - If true, performs full analysis including dynamic data (default: false)
 */
function analyzeRoom(room, fullAnalysis = false) {
  Log.test(`🔍 Analyzing room ${room.name}`, "roomAnalysis");
  if (!room || !room.memory) return;

  const {memory} = room;
  
  // Initialize Memory.rooms if needed
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[room.name]) {
    Memory.rooms[room.name] = {};
  }


  // Set lastCheck in Memory.rooms (works even without vision)
  Memory.rooms[room.name].lastCheck = Game.time;

  try {

    // ===== Static Data (only set once) =====
    if (!memory.roomType) {
      // Source keeper rooms
      const lairs = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_KEEPER_LAIR,
      });
      if (lairs.length > 0) {
        memory.roomType = "ROOMTYPE_SOURCEKEEPER";
        memory.keeperLairs = lairs.length;
        return;
      }

      // Core rooms (3 sources)
      const sources = room.find(FIND_SOURCES);
      if (sources.length === CONSTANTS.ROOM.SOURCE_COUNT_CORE) {
        memory.roomType = "ROOMTYPE_CORE";
      } else if (room.controller) {
        memory.roomType = "ROOMTYPE_CONTROLLER";
      } else {
        memory.roomType = "ROOMTYPE_ALLEY";
      }

      // Source information (static)
      // Use new unified structure: Memory.rooms[room.name].structures.sources[sourceId]
      if (!Memory.rooms[room.name].structures) Memory.rooms[room.name].structures = {};
      if (!Memory.rooms[room.name].structures.sources) Memory.rooms[room.name].structures.sources = {};
      
      const existingSourcesMemory = Memory.rooms[room.name].structures.sources;
      
      // Create array with all source information
      memory.sources = sources.map(s => {
        const sourceMemory = existingSourcesMemory[s.id] || {};
        return {
          id: s.id,
          x: s.pos.x,
          y: s.pos.y,
          freeSpaces: s.freeSpacesCount,
          containerID: sourceMemory.containerID || null,
          linkID: sourceMemory.linkID || null,
        };
      });
      
      // Ensure object structure exists for Source.prototype.memory
      for (const source of sources) {
        if (!Memory.rooms[room.name].structures.sources[source.id]) {
          Memory.rooms[room.name].structures.sources[source.id] = {};
        }
        // Preserve existing containerID/linkID if they exist
        const existing = existingSourcesMemory[source.id];
        if (existing) {
          if (existing.containerID) Memory.rooms[room.name].structures.sources[source.id].containerID = existing.containerID;
          if (existing.linkID) Memory.rooms[room.name].structures.sources[source.id].linkID = existing.linkID;
        }
      }

      // Mineral information (static)
      if (room.mineral) {
        Log.test(`🔍 Mineral found in room ${room.name}`, "roomAnalysis");
        // Use new unified structure: Memory.rooms[room.name].structures.minerals[mineralId]
        if (!Memory.rooms[room.name].structures) Memory.rooms[room.name].structures = {};
        if (!Memory.rooms[room.name].structures.minerals) Memory.rooms[room.name].structures.minerals = {};
        
        const mineralId = room.mineral.id;
        const existingMineral = Memory.rooms[room.name].structures.minerals[mineralId] || {};
        
        // Store in new structure
        Memory.rooms[room.name].structures.minerals[mineralId] = {
          type: room.mineral.mineralType,
          x: room.mineral.pos.x,
          y: room.mineral.pos.y,
          id: room.mineral.id,
          mineralId: existingMineral.mineralId || room.mineral.id,
        };
        
        // Store in memory.mineral for analyzeRoom/Scout
        memory.mineral = Memory.rooms[room.name].structures.minerals[mineralId];
      }

      // Portal information (static)
      const portals = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_PORTAL,
      });
      if (portals.length > 0) {
        memory.portal = {
          id: portals[0].id,
          x: portals[0].pos.x,
          y: portals[0].pos.y,
          destination: portals[0].destination ? {
            room: portals[0].destination.room,
            shard: portals[0].destination.shard,
          } : null,
        };
      }

      // Power Bank information (static)
      const powerBanks = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_POWER_BANK,
      });
      if (powerBanks.length > 0) {
        memory.powerBank = {
          id: powerBanks[0].id,
          x: powerBanks[0].pos.x,
          y: powerBanks[0].pos.y,
          power: powerBanks[0].power,
        };
      }

      // Deposit information (static)
      const deposits = room.find(FIND_DEPOSITS);
      if (deposits.length > 0) {
        memory.deposits = deposits.map(d => ({
          id: d.id,
          x: d.pos.x,
          y: d.pos.y,
          type: d.depositType,
          cooldown: d.cooldown,
        }));
      }
    }

    // ===== Dynamic Data (updated on full analysis) =====
    if (fullAnalysis) {
      // Controller information
      if (room.controller) {
        // Use new unified structure: Memory.rooms[room.name].structures.controllers[controllerId]
        if (!Memory.rooms[room.name].structures) Memory.rooms[room.name].structures = {};
        if (!Memory.rooms[room.name].structures.controllers) Memory.rooms[room.name].structures.controllers = {};
        
        const controllerId = room.controller.id;
        const existingController = Memory.rooms[room.name].structures.controllers[controllerId] || {};
        
        // Store in new structure
        Memory.rooms[room.name].structures.controllers[controllerId] = {
          level: room.controller.level,
          progress: room.controller.progress,
          progressTotal: room.controller.progressTotal,
          owner: room.controller.owner ? room.controller.owner.username : null,
          reservation: room.controller.reservation ? {
            username: room.controller.reservation.username,
            ticksToEnd: room.controller.reservation.ticksToEnd,
          } : null,
          upgradeBlocked: room.controller.upgradeBlocked,
          my: room.controller.my,
          containerID: existingController.containerID || null, // Preserve for controller.memory.containerID
        };
        
        // Store in memory.controller for analyzeRoom/Scout
        memory.controller = Memory.rooms[room.name].structures.controllers[controllerId];
      }

      // Important structures
      // Preserve existing nested structure memory (used by Structure.prototype.memory)
      // Memory.rooms[room.name].structures[structureType + 's'][id] is the nested structure
      // We store a flat summary in structures, but keep the nested structure intact
      const existingStructures = Memory.rooms[room.name].structures || {};
      
      // Ensure nested structure exists for Structure.prototype.memory compatibility
      if (!Memory.rooms[room.name].structures || typeof Memory.rooms[room.name].structures !== 'object' || Array.isArray(Memory.rooms[room.name].structures)) {
        Memory.rooms[room.name].structures = {};
      }
      
      // Store flat summary for analyzeRoom/Scout
      // Note: Since room.memory === Memory.rooms[room.name], setting memory.structures
      // will overwrite Memory.rooms[room.name].structures, so we need to restore the nested structure
      const mySpawns = room.find(FIND_MY_SPAWNS);
      const extensions = room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_EXTENSION,
      });
      const towers = room.towers || room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER,
      });
      const links = room.links || room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_LINK,
      });
      const labs = room.labs || room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_LAB,
      });
      const nukers = room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_NUKER,
      });
      const observers = room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_OBSERVER,
      });
      const powerSpawns = room.powerSpawn ? [room.powerSpawn] : room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_POWER_SPAWN,
      });
      
      memory.structures = {
        spawn: mySpawns.length,
        extension: extensions.length,
        storage: room.storage ? { id: room.storage.id, x: room.storage.pos.x, y: room.storage.pos.y } : null,
        terminal: room.terminal ? { id: room.terminal.id, x: room.terminal.pos.x, y: room.terminal.pos.y } : null,
        factory: room.factory ? { id: room.factory.id, x: room.factory.pos.x, y: room.factory.pos.y } : null,
        tower: towers.length,
        link: links.length,
        lab: labs.length,
        nuker: nukers.length,
        observer: observers.length,
        powerSpawn: powerSpawns.length,
      };
      
      // Restore nested structure after setting flat structure (since they share the same object)
      // The nested structure is used by Structure.prototype.memory: structures[structureType + 's'][id]
      if (existingStructures && Object.keys(existingStructures).length > 0) {
        // Restore nested structure keys (labs, extractors, controllers, etc.)
        for (const key in existingStructures) {
          if (key.endsWith('s') && typeof existingStructures[key] === 'object' && !Array.isArray(existingStructures[key])) {
            Memory.rooms[room.name].structures[key] = existingStructures[key];
          }
        }
      }

      // Invader cores
      const invaderCores = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_INVADER_CORE,
      });
      if (invaderCores.length > 0) {
        memory.invaderCores = invaderCores.map(c => ({
          id: c.id,
          x: c.pos.x,
          y: c.pos.y,
          level: c.level,
          ticksToDeploy: c.ticksToDeploy,
        }));
      }

      // Calculate room score for claiming priority
      memory.score = calculateRoomScore(room, memory);
    }

    // Log summary of analysis
    logAnalysisSummary(room, memory, fullAnalysis);
  } catch (e) {
    Log.error(e, "analyzeRoom");
  }
}

/**
 * Logs a summary of room analysis
 * @param {Room} room - The analyzed room
 * @param {Object} memory - The room's memory
 * @param {boolean} fullAnalysis - Whether full analysis was performed
 */
function logAnalysisSummary(room, memory, fullAnalysis) {
  const parts = [];

  // Load utils.resources once at the start
  let utilsResources = null;
  try {
    utilsResources = require("./utils.resources");
  } catch (e) {
    // utils.resources not available
  }

  // Room type
  parts.push(`Type: ${memory.roomType}`);

  // Sources
  if (memory.sources && memory.sources.length > 0) {
    parts.push(`Sources: ${memory.sources.length}`);
  }

  // Mineral
  if (memory.mineral && memory.mineral.type) {
    // Use resourceImg helper if available, otherwise just use the type string
    if (utilsResources && typeof utilsResources.resourceImg === "function") {
      const resourceImg = utilsResources.resourceImg(memory.mineral.type);
      parts.push(`Mineral: ${resourceImg}`);
    } else {
      parts.push(`Mineral: ${memory.mineral.type}`);
    }
  }

  // Controller info (if full analysis)
  if (fullAnalysis && memory.controller) {
    if (memory.controller.my) {
      parts.push(`Controller: RCL${memory.controller.level} (OWNED)`);
    } else if (memory.controller.owner) {
      parts.push(`Controller: RCL${memory.controller.level} (${memory.controller.owner})`);
    } else if (memory.controller.reservation) {
      parts.push(`Controller: Reserved by ${memory.controller.reservation.username}`);
    } else {
      parts.push(`Controller: RCL${memory.controller.level} (Available)`);
    }
  }

  // Special features
  if (memory.portal) {
    const dest = memory.portal.destination;
    if (dest) {
      parts.push(`Portal → ${dest.room}${dest.shard ? ` (${dest.shard})` : ""}`);
    } else {
      parts.push("Portal (unknown destination)");
    }
  }
  if (memory.powerBank) {
    parts.push(`Power Bank: ${memory.powerBank.power} power`);
  }
  if (memory.deposits && memory.deposits.length > 0) {
    parts.push(`Deposits: ${memory.deposits.length}`);
  }
  if (memory.keeperLairs) {
    parts.push(`Keeper Lairs: ${memory.keeperLairs}`);
  }

  // Structures (if full analysis and own room)
  if (fullAnalysis && memory.structures && memory.controller && memory.controller.my) {
    const structParts = [];
    const structures = memory.structures || {};
    if (structures.spawn > 0) structParts.push(`${structures.spawn}S`);
    if (structures.tower > 0) structParts.push(`${structures.tower}T`);
    if (structures.storage) structParts.push("Storage");
    if (structures.terminal) structParts.push("Terminal");
    if (structures.factory) structParts.push("Factory");
    if (structParts.length > 0) {
      parts.push(`Structures: ${structParts.join(", ")}`);
    }
  }

  // Room score (if full analysis and room is not owned)
  if (fullAnalysis && memory.score && (!memory.controller || !memory.controller.my)) {
    const scoreParts = [];
    if (memory.score.breakdown.isFree > 0) scoreParts.push("✅ Free");
    if (memory.score.breakdown.hasTwoSources > 0) scoreParts.push("2 Sources");
    if (memory.score.breakdown.lowSwamp > 0) scoreParts.push(`Low Swamp (${memory.score.breakdown.swampPercentage}%)`);
    if (memory.score.breakdown.highFreeSpace > 0) scoreParts.push(`Free Space (${memory.score.breakdown.freeSpacePercentage}%)`);
    if (memory.score.breakdown.newMineral > 0 && memory.score.breakdown.mineralType) {
      if (utilsResources && typeof utilsResources.resourceImg === "function") {
        const resourceImg = utilsResources.resourceImg(memory.score.breakdown.mineralType);
        scoreParts.push(`New Mineral: ${resourceImg}`);
      } else {
        scoreParts.push(`New Mineral: ${memory.score.breakdown.mineralType}`);
      }
    }
    if (scoreParts.length > 0) {
      parts.push(`⭐ Score: ${memory.score.total} (${scoreParts.join(", ")})`);
    } else {
      parts.push(`⭐ Score: ${memory.score.total}`);
    }
  }

  const summary = `📊 ${room.name}: ${parts.join(" | ")}`;
  Log.success(summary, "analyzeRoom");
}

module.exports = {
  analyzeRoom,
};

