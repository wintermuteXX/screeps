/**
 * Room Prototype Extensions
 */

const ResourceManager = require("./service.resource");

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

// Wrapper für Fälle ohne Room-Kontext (z.B. in _initGlobal.js)
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
// In Screeps, StructureController is the type for room.controller
if (typeof StructureController !== 'undefined') {
  Object.defineProperty(StructureController.prototype, "memory", {
    get: function () {
      if (!Memory.rooms[this.room.name].structures) Memory.rooms[this.room.name].structures = {};
      if (!Memory.rooms[this.room.name].structures.controllers) Memory.rooms[this.room.name].structures.controllers = {};
      if (!Memory.rooms[this.room.name].structures.controllers[this.id]) Memory.rooms[this.room.name].structures.controllers[this.id] = {};
      return Memory.rooms[this.room.name].structures.controllers[this.id];
    },
    set: function (v) {
      if (!Memory.rooms[this.room.name].structures) Memory.rooms[this.room.name].structures = {};
      if (!Memory.rooms[this.room.name].structures.controllers) Memory.rooms[this.room.name].structures.controllers = {};
      return (Memory.rooms[this.room.name].structures.controllers[this.id] = v);
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
 * Prüft ob ein Raum bereits geclaimt ist
 * @param {string} roomName - Name des Raums
 * @returns {boolean} True wenn Raum bereits geclaimt ist
 */
Room.isRoomClaimed = function (roomName) {
  const roomMemory = Memory.rooms && Memory.rooms[roomName];
  const gameRoom = Game.rooms[roomName];
  
  // Use new structure (structures.controllers)
  let controllerMemory = null;
  if (roomMemory && roomMemory.structures && roomMemory.structures.controllers) {
    // Get first controller from structures.controllers
    const controllerIds = Object.keys(roomMemory.structures.controllers);
    if (controllerIds.length > 0) {
      controllerMemory = roomMemory.structures.controllers[controllerIds[0]];
    }
  }
  
  return (controllerMemory && controllerMemory.my) ||
         (gameRoom && gameRoom.controller && gameRoom.controller.my);
};

/**
 * Prüft ob bereits ein Claimer für einen Raum existiert
 * @param {string} roomName - Name des Raums
 * @param {Array} existingClaimers - Array von existierenden Claimer Creeps
 * @returns {boolean} True wenn bereits ein Claimer für den Raum existiert
 */
Room.hasClaimerForRoom = function (roomName, existingClaimers) {
  return existingClaimers.some(c => 
    c.memory.targetRoom === roomName || (c.room && c.room.name === roomName)
  );
};

/**
 * Prüft ob ein Raum für Claiming geeignet ist
 * @param {string} roomName - Name des Raums
 * @returns {boolean} True wenn Raum für Claiming geeignet ist
 */
Room.isRoomValidForClaiming = function (roomName) {
  if (!Memory.rooms || !Memory.rooms[roomName]) {
    return false;
  }
  if (Room.isRoomClaimed(roomName)) {
    return false;
  }
  const roomMemory = Memory.rooms[roomName];
  
  // Use new structure (structures.controllers)
  let controllerMemory = null;
  if (roomMemory.structures && roomMemory.structures.controllers) {
    const controllerIds = Object.keys(roomMemory.structures.controllers);
    if (controllerIds.length > 0) {
      controllerMemory = roomMemory.structures.controllers[controllerIds[0]];
    }
  }
  
  // Prüfe ob Raum bereits von jemand anderem geclaimt ist
  if (controllerMemory && controllerMemory.owner && !controllerMemory.my) {
    return false;
  }
  
  // Prüfe ob Layout-Generierung fehlgeschlagen ist
  // layoutGenerated === false bedeutet: geprüft und kann nicht generiert werden
  // layoutGenerated === undefined bedeutet: noch nicht geprüft (erlauben)
  // layoutGenerated === true bedeutet: Layout existiert (erlauben)
  if (roomMemory.planner && roomMemory.planner.layoutGenerated === false) {
    return false;
  }
  
  return true;
};

