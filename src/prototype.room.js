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
    if (!this.memory.mineral) {
      this.memory.mineral = {};
    }
    if (this.memory.mineral.mineralId === undefined) {
      const [theMineral] = this.find(FIND_MINERALS);
      if (!theMineral) {
        this.memory.mineral.mineralId = null;
        this._mineral = null;
        return null;
      }
      this._mineral = theMineral;
      this.memory.mineral.mineralId = theMineral.id;
    } else {
      this._mineral = Game.getObjectById(this.memory.mineral.mineralId);
      // If mineral no longer exists, clear cache
      if (!this._mineral) {
        this.memory.mineral.mineralId = undefined;
      }
    }
    return this._mineral;
  },
  enumerable: false,
  configurable: true,
});

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
  return (roomMemory && roomMemory.controller && roomMemory.controller.my) ||
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
  // Prüfe ob Raum bereits von jemand anderem geclaimt ist
  if (roomMemory.controller && roomMemory.controller.owner && !roomMemory.controller.my) {
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

