/**
 * Room Prototype Extensions
 */

const ResourceManager = require("./service.resource");
const Log = require("./lib.log");
const duneConfig = require("./config.dune");

Room.prototype.getResourceAmount = function (res, structure = "all") {
  return ResourceManager.getResourceAmount(this, res, structure);
};

Room.prototype.roomNeedResources = function () {
  if (!this._needResources) {
    this._needResources = ResourceManager.getRoomNeeds(this);
  }
  return this._needResources;
};

Room.prototype.getRoomThreshold = function (resource, structure = "all") {
  return ResourceManager.getRoomThreshold(resource, structure);
};

// Wrapper for cases without room context (e.g. in _initGlobal.js)
global.getRoomThreshold = function (resource, structure = "all") {
  return ResourceManager.getRoomThreshold(resource, structure);
};

Object.defineProperty(Room.prototype, "mineral", {
  get: function () {
    if (this === Room.prototype || this === undefined) return undefined;
    // Cache for current tick
    if (this._mineral !== undefined) {
      return this._mineral;
    }
    // Initialize memory structure only if it doesn't exist
    if (!this.memory.structures) this.memory.structures = {};
    if (!this.memory.structures.minerals) this.memory.structures.minerals = {};
    
    // Find mineral ID (try to get from existing memory or find in room)
    const [theMineral] = this.find(FIND_MINERALS);
    const mineralId = theMineral ? theMineral.id : null;
    
    if (!mineralId) {
      this._mineral = null;
      return null;
    }
    
    // Initialize mineral memory entry
    if (!this.memory.structures.minerals[mineralId]) {
      this.memory.structures.minerals[mineralId] = {};
    }
    
    // Check if mineralId is stored, otherwise store it
    if (this.memory.structures.minerals[mineralId].mineralId === undefined) {
      this.memory.structures.minerals[mineralId].mineralId = mineralId;
    }
    
    this._mineral = Game.getObjectById(this.memory.structures.minerals[mineralId].mineralId);
    // If mineral no longer exists, clear cache
    if (!this._mineral) {
      this.memory.structures.minerals[mineralId].mineralId = undefined;
    }
    return this._mineral;
  },
  enumerable: false,
  configurable: true,
});

// Add memory property to StructureController (accessed via room.controller.memory)
// Single controller per room: Memory.rooms[roomName].structures.controller
if (typeof StructureController !== 'undefined') {
  Object.defineProperty(StructureController.prototype, "memory", {
    get: function () {
      const structures = Memory.rooms[this.room.name].structures;
      if (!structures) Memory.rooms[this.room.name].structures = { controller: {} };
      const str = Memory.rooms[this.room.name].structures;
      if (!str.controller) {
        // Migrate from legacy structures.controllers[id]
        if (str.controllers && str.controllers[this.id]) {
          str.controller = str.controllers[this.id];
          delete str.controllers;
        } else {
          str.controller = {};
        }
      }
      return str.controller;
    },
    set: function (v) {
      if (!Memory.rooms[this.room.name].structures) Memory.rooms[this.room.name].structures = {};
      Memory.rooms[this.room.name].structures.controller = v;
      return v;
    },
  });
}

Room.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    return `<a href="#!/room/${Game.shard.name}/${this.name}">[${this.name}]</a>`;
  }
  return `[(${this.name}) #${this.name}]`;
};

/**
 * Check if a room is already claimed
 * @param {string} roomName - Name des Raums
 * @returns {boolean} True wenn Raum bereits geclaimt ist
 */
Room.isRoomClaimed = function (roomName) {
  const roomMemory = Memory.rooms && Memory.rooms[roomName];
  const gameRoom = Game.rooms[roomName];
  
  // Single controller per room: structures.controller
  let controllerMemory = null;
  if (roomMemory && roomMemory.structures) {
    if (roomMemory.structures.controller) {
      controllerMemory = roomMemory.structures.controller;
    } else if (roomMemory.structures.controllers) {
      const controllerIds = Object.keys(roomMemory.structures.controllers);
      if (controllerIds.length > 0) {
        controllerMemory = roomMemory.structures.controllers[controllerIds[0]];
      }
    }
  }
  
  return (controllerMemory && controllerMemory.my) ||
         (gameRoom && gameRoom.controller && gameRoom.controller.my);
};

/**
 * Check if a claimer already exists for a room
 * @param {string} roomName - Name des Raums
 * @param {Array} existingClaimers - Array von existierenden Claimer Creeps
 * @returns {boolean} True if a claimer already exists for the room
 */
Room.hasClaimerForRoom = function (roomName, existingClaimers) {
  return existingClaimers.some(c => 
    c.memory.targetRoom === roomName || (c.room && c.room.name === roomName)
  );
};

/**
 * Check if a room is valid for claiming
 * @param {string} roomName - Name des Raums
 * @returns {boolean} True if the room is valid for claiming
 */
Room.isRoomValidForClaiming = function (roomName) {
  if (!Memory.rooms || !Memory.rooms[roomName]) {
    return false;
  }
  if (Room.isRoomClaimed(roomName)) {
    return false;
  }
  const roomMemory = Memory.rooms[roomName];
  
  // Single controller per room: structures.controller
  let controllerMemory = null;
  if (roomMemory.structures) {
    if (roomMemory.structures.controller) {
      controllerMemory = roomMemory.structures.controller;
    } else if (roomMemory.structures.controllers) {
      const controllerIds = Object.keys(roomMemory.structures.controllers);
      if (controllerIds.length > 0) {
        controllerMemory = roomMemory.structures.controllers[controllerIds[0]];
      }
    }
  }
  
  // Check if the room is already claimed by someone else
  if (controllerMemory && controllerMemory.owner && !controllerMemory.my) {
    return false;
  }
  
  // Check if layout generation failed
  // layoutGenerated === false means: checked and cannot be generated
  // layoutGenerated === undefined means: not checked yet (allow)
  // layoutGenerated === true bedeutet: Layout existiert (erlauben)
  if (roomMemory.planner && roomMemory.planner.layoutGenerated === false) {
    return false;
  }
  
  return true;
};

/**
 * Finds a hostile target in the room (creeps, spawns, or structures)
 * Excludes controllers from the search
 * @returns {Creep|StructureSpawn|Structure|null} First hostile target found or null
 */
Room.prototype.getHostileTarget = function () {
  const TARGETS = [FIND_HOSTILE_CREEPS, FIND_HOSTILE_SPAWNS, FIND_HOSTILE_STRUCTURES];

  const filter = function (t) {
    if (t.structureType && t.structureType === STRUCTURE_CONTROLLER) return false;
    return global.isHostileUsername(t.owner.username);
  };

  for (const targetType of TARGETS) {
    const targets = _.filter(this.find(targetType), filter);
    if (targets.length) {
      return targets[0];
    }
  }

  return null;
};

/**
 * Finds a hostile building target in the room (spawns or structures, no creeps)
 * Excludes controllers from the search
 * Returns a random target from available options
 * @returns {StructureSpawn|Structure|null} Random hostile building target found or null
 */
Room.prototype.getHostileBuildingTarget = function () {
  const TARGETS = [FIND_HOSTILE_SPAWNS, FIND_HOSTILE_STRUCTURES];

  const filter = function (t) {
    if (t.structureType && t.structureType === STRUCTURE_CONTROLLER) return false;
    return global.isHostileUsername(t.owner.username);
  };

  for (const i in TARGETS) {
    const targets = _.filter(this.find(TARGETS[i]), filter);
    if (targets.length) {
      return targets[Math.floor(Math.random() * targets.length)];
    }
  }

  return null;
};

/**
 * Finds a flag by color in the game
 * @param {number} color - Flag color (e.g., COLOR_WHITE, COLOR_RED)
 * @returns {Flag|null} First flag with the specified color or null
 */
Room.prototype.findFlagByColor = function (color) {
  return _.find(Game.flags, { color: color });
};

/**
 * Ensures Memory.rooms[roomName] exists and is initialized (global memory)
 * Static method - can be called without a room instance
 * @param {string} roomName - Name of the room
 */
Room.ensureMemory = function (roomName) {
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[roomName]) {
    Memory.rooms[roomName] = {};
  }
};

/**
 * Checks if a room needs to be analyzed
 * Static method - can be called without a room instance
 * @param {string} roomName - Name of the room to check
 * @returns {boolean} True if room needs analysis
 */
Room.needsAnalysis = function (roomName) {
  // Check Memory.rooms[roomName].lastCheck (works even without vision)
  if (Memory.rooms && Memory.rooms[roomName]) {
    const {lastCheck} = Memory.rooms[roomName];
    // Needs analysis if never checked or last check was more than 100000 ticks ago
    return !lastCheck || (Game.time - lastCheck > 100000);
  }

  // If no memory entry, we need to visit it
  return true;
};

/**
 * Checks if a room is hostile and should be avoided
 * Uses multiple sources: Traveler memory, room memory, and direct controller check
 * Static method - can be called without a room instance
 * @param {string} roomName - Name of the room to check
 * @returns {boolean} True if room should be avoided
 */
Room.isHostile = function (roomName) {
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
    Room.ensureMemory(roomName);

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
};

/**
 * Attempts to sign the controller with a Dune-inspired message
 * @param {Creep} creep - The creep that will sign the controller
 * @returns {boolean} True if signing was attempted or completed
 */
Room.prototype.signController = function (creep) {
  const {controller} = this;
  if (!controller || controller.my) {
    return false;
  }

  const roomName = this.name;
  Room.ensureMemory(roomName);
  const roomMemory = Memory.rooms[roomName];
  if (roomMemory.controllerSigned === true) {
    return false;
  }

  const randomMessage = duneConfig.DUNE_MESSAGES[Math.floor(Math.random() * duneConfig.DUNE_MESSAGES.length)];
  const signResult = creep.signController(controller, randomMessage);

  if (signResult === OK) {
    roomMemory.controllerSigned = true;
    Log.success(`✍️ ${creep} signed controller in ${this} with: "${randomMessage}"`, "sign_controller");
    return true;
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
      Log.warn(`⚠️ ${creep} cannot reach controller in ${this} (pathfinding error: ${global.getErrorString(moveResult)}), marking as signed`, "sign_controller");
      return true;
    } else if (moveResult === ERR_NO_PATH) {
      // If no path exists, mark as signed to avoid infinite retries
      roomMemory.controllerSigned = true;
      Log.warn(`⚠️ ${creep} no path to controller in ${this}, marking as signed`, "sign_controller");
      return true;
    }
    return true; // Movement initiated
  }

  return false;
};

