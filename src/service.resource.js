/**
 * ResourceManager - Zentrale Klasse für alle Ressourcenberechnungen
 * Konsolidiert alle Funktionen, die Ressourcen in Räumen berechnen
 */
class ResourceManager {
  constructor() {
    // Cache pro Tick
    this._cache = {};
    this._cacheTick = null;
  }

  /**
   * Clears cache if we're on a new tick
   */
  _ensureCache() {
    if (this._cacheTick !== Game.time) {
      this._cache = {};
      this._cacheTick = Game.time;
    }
  }

  /**
   * Gets resource amount in a room from storage, terminal, and/or factory
   * @param {Room} room - The room to check
   * @param {string} resource - Resource type (e.g., RESOURCE_ENERGY)
   * @param {string} structure - Structure type: "all", "storage", "terminal", "factory"
   * @returns {number} Total amount of the resource
   */
  getResourceAmount(room, resource, structure = "all") {
    this._ensureCache();
    const cacheKey = `resource_${room.name}_${resource}_${structure}`;

    if (this._cache[cacheKey] !== undefined) {
      return this._cache[cacheKey];
    }

    let amount = 0;

    if (structure === "all" || structure === "storage") {
      if (room.storage && room.storage.store && room.storage.store[resource]) {
        amount += room.storage.store[resource];
      }
    }

    if (structure === "all" || structure === "terminal") {
      if (room.terminal && room.terminal.store && room.terminal.store[resource]) {
        amount += room.terminal.store[resource];
      }
    }

    if (structure === "all" || structure === "factory") {
      if (room.factory && room.factory.store && room.factory.store[resource]) {
        amount += room.factory.store[resource];
      }
    }

    this._cache[cacheKey] = amount;
    return amount;
  }

  /**
   * Gets the threshold (fill level) for a resource in a structure
   * @param {string} resource - Resource type
   * @param {string} structure - Structure type: "all", "storage", "terminal", "factory", "factory1-5"
   * @returns {number} Threshold amount
   */
  getRoomThreshold(resource, structure = "all") {
    this._ensureCache();
    const cacheKey = `threshold_${resource}_${structure}`;

    if (this._cache[cacheKey] !== undefined) {
      return this._cache[cacheKey];
    }

    if (!global.fillLevel || !global.fillLevel[resource]) {
      this._cache[cacheKey] = 0;
      return 0;
    }

    const fillLevel = global.fillLevel[resource];
    let amount = 0;

    if (structure === "all" || structure === "storage") {
      amount += fillLevel.storage || 0;
    }
    if (structure === "all" || structure === "terminal") {
      amount += fillLevel.terminal || 0;
    }
    if (structure === "all" || structure === "factory") {
      amount += fillLevel.factory || 0;
    }
    if (structure === "factory1") {
      amount += fillLevel.factory1 || 0;
    }
    if (structure === "factory2") {
      amount += fillLevel.factory2 || 0;
    }
    if (structure === "factory3") {
      amount += fillLevel.factory3 || 0;
    }
    if (structure === "factory4") {
      amount += fillLevel.factory4 || 0;
    }
    if (structure === "factory5") {
      amount += fillLevel.factory5 || 0;
    }

    this._cache[cacheKey] = amount;
    return amount;
  }

  /**
   * Gets total resource amount across all rooms
   * @param {string} resource - Resource type
   * @returns {number} Total amount across all rooms
   */
  getGlobalResourceAmount(resource) {
    this._ensureCache();
    const cacheKey = `global_${resource}`;

    if (this._cache[cacheKey] !== undefined) {
      return this._cache[cacheKey];
    }

    let amount = 0;
    let allStructures = [];

    for (var i in Game.rooms) {
      const room = Game.rooms[i];
      const storeStructures = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return "store" in structure;
        },
      });
      allStructures = allStructures.concat(storeStructures);
    }

    for (var i in allStructures) {
      if (allStructures[i].store && allStructures[i].store[resource] > 0) {
        amount += allStructures[i].store[resource];
      }
    }

    this._cache[cacheKey] = amount;
    return amount;
  }

  /**
   * Gets resources that a room needs (has < threshold)
   * @param {Room} room - The room to check
   * @returns {Array} Array of {resourceType, amount, room} objects
   */
  getRoomNeeds(room) {
    this._ensureCache();
    const cacheKey = `needs_${room.name}`;

    if (this._cache[cacheKey] !== undefined) {
      return this._cache[cacheKey];
    }

    const needs = [];

    if (room.terminal) {
      for (const res of RESOURCES_ALL) {
        const has = this.getResourceAmount(room, res);
        const want = this.getRoomThreshold(res);
        if (has < want) {
          needs.push({
            resourceType: res,
            amount: has - want,
            room: room.name,
          });
        }
      }
    }

    this._cache[cacheKey] = needs;
    return needs;
  }

  /**
   * Checks if room has enough of a resource
   * @param {Room} room - The room to check
   * @param {string} resource - Resource type
   * @param {string} structure - Structure type
   * @returns {boolean} True if room has enough resources
   */
  hasEnoughResource(room, resource, structure = "all") {
    const has = this.getResourceAmount(room, resource, structure);
    const threshold = this.getRoomThreshold(resource, structure);
    return has >= threshold;
  }
}

// Export singleton instance
module.exports = new ResourceManager();

