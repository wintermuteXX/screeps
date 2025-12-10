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
    if (this == Room.prototype || this == undefined) return undefined;
    // Cache for current tick
    if (this._mineral !== undefined) {
      return this._mineral;
    }
    // Initialize memory structure only if it doesn't exist
    if (!this.memory.mineral) {
      this.memory.mineral = {};
    }
    if (this.memory.mineral.mineralId === undefined) {
      let [theMineral] = this.find(FIND_MINERALS);
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

