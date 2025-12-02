const Log = require("Log");
const CONSTANTS = require("./constants");

/**
 * Analyse a room and store comprehensive data in memory
 * Can be called from ControllerRoom or Scout
 * @param {Room} room - The room to analyse
 * @param {boolean} fullAnalysis - If true, performs full analysis including dynamic data (default: false)
 */
function analyzeRoom(room, fullAnalysis = false) {
  if (!room || !room.memory) return;
  
  const memory = room.memory;
  
  try {
    memory.lastCheck = Game.time;

    // ===== Static Data (only set once) =====
    if (!memory.roomType) {
      // Source keeper rooms
      let lairs = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_KEEPER_LAIR
      });
      if (lairs.length > 0) {
        memory.roomType = "ROOMTYPE_SOURCEKEEPER";
        memory.keeperLairs = lairs.length;
        return;
      }

      // Core rooms (3 sources)
      let sources = room.find(FIND_SOURCES);
      if (sources.length === CONSTANTS.ROOM.SOURCE_COUNT_CORE) {
        memory.roomType = "ROOMTYPE_CORE";
      } else if (room.controller) {
        memory.roomType = "ROOMTYPE_CONTROLLER";
      } else {
        memory.roomType = "ROOMTYPE_ALLEY";
      }

      // Source information (static)
      memory.sources = sources.map(s => ({
        id: s.id,
        x: s.pos.x,
        y: s.pos.y,
      }));
      memory.sourceCount = sources.length;

      // Mineral information (static)
      if (room.mineral) {
        memory.mineral = {
          type: room.mineral.mineralType,
          x: room.mineral.pos.x,
          y: room.mineral.pos.y,
          id: room.mineral.id,
        };
      }

      // Portal information (static)
      let portals = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_PORTAL
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
      let powerBanks = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_POWER_BANK
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
      let deposits = room.find(FIND_DEPOSITS);
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
        memory.controller = {
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
        };
      }

      // Important structures
      memory.structures = {
        spawn: room.find(FIND_MY_SPAWNS).length,
        extension: room.find(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_EXTENSION
        }).length,
        storage: room.storage ? { id: room.storage.id, x: room.storage.pos.x, y: room.storage.pos.y } : null,
        terminal: room.terminal ? { id: room.terminal.id, x: room.terminal.pos.x, y: room.terminal.pos.y } : null,
        factory: room.factory ? { id: room.factory.id, x: room.factory.pos.x, y: room.factory.pos.y } : null,
        tower: room.find(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_TOWER
        }).length,
        link: room.find(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_LINK
        }).length,
        lab: room.find(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_LAB
        }).length,
        nuker: room.find(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_NUKER
        }).length,
        observer: room.find(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_OBSERVER
        }).length,
        powerSpawn: room.find(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_POWER_SPAWN
        }).length,
      };

      // Hostile information
      let hostiles = room.find(FIND_HOSTILE_CREEPS);
      let hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
      memory.hostiles = {
        creeps: hostiles.length,
        structures: hostileStructures.length,
        usernames: hostiles.map(c => c.owner.username).filter((v, i, a) => a.indexOf(v) === i), // unique usernames
      };

      // Invader cores
      let invaderCores = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
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

      // Energy available
      memory.energy = {
        available: room.energyAvailable,
        capacity: room.energyCapacityAvailable,
      };
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
  
  // Room type
  parts.push(`Type: ${memory.roomType}`);
  
  // Sources
  if (memory.sourceCount !== undefined) {
    parts.push(`Sources: ${memory.sourceCount}`);
  }
  
  // Mineral
  if (memory.mineral) {
    // Use resourceImg helper if available, otherwise just use the type string
    const utilsResources = require("utils.resources");
    const resourceImg = utilsResources.resourceImg 
      ? utilsResources.resourceImg(memory.mineral.type) 
      : memory.mineral.type;
    parts.push(`Mineral: ${resourceImg}`);
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
  
  // Hostiles (if full analysis)
  if (fullAnalysis && memory.hostiles) {
    if (memory.hostiles.creeps > 0 || memory.hostiles.structures > 0) {
      const hostileInfo = [];
      if (memory.hostiles.creeps > 0) {
        hostileInfo.push(`${memory.hostiles.creeps} creeps`);
      }
      if (memory.hostiles.structures > 0) {
        hostileInfo.push(`${memory.hostiles.structures} structures`);
      }
      if (memory.hostiles.usernames && memory.hostiles.usernames.length > 0) {
        hostileInfo.push(`(${memory.hostiles.usernames.join(', ')})`);
      }
      parts.push(`⚠️ Hostiles: ${hostileInfo.join(' ')}`);
    }
  }
  
  // Special features
  if (memory.portal) {
    const dest = memory.portal.destination;
    if (dest) {
      parts.push(`Portal → ${dest.room}${dest.shard ? ` (${dest.shard})` : ''}`);
    } else {
      parts.push(`Portal (unknown destination)`);
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
    if (memory.structures.spawn > 0) structParts.push(`${memory.structures.spawn}S`);
    if (memory.structures.tower > 0) structParts.push(`${memory.structures.tower}T`);
    if (memory.structures.storage) structParts.push('Storage');
    if (memory.structures.terminal) structParts.push('Terminal');
    if (memory.structures.factory) structParts.push('Factory');
    if (structParts.length > 0) {
      parts.push(`Structures: ${structParts.join(', ')}`);
    }
  }
  
  const summary = `📊 ${room.name}: ${parts.join(' | ')}`;
  Log.success(summary, "analyzeRoom");
}

module.exports = {
  analyzeRoom,
  logAnalysisSummary
};

