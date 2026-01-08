/**
 * Helper functions for structure operations
 * Provides reusable functions for common structure-finding patterns
 */

/**
 * Find structures by type with caching support
 * Works with both Room and ControllerRoom objects
 * @param {Room|ControllerRoom} roomOrRc - Room or RoomController instance
 * @param {string} structureType - Structure type constant (e.g., STRUCTURE_LAB)
 * @param {boolean} myOnly - Only find own structures (default: true)
 * @returns {Structure[]} Array of matching structures
 */
function findStructuresByType(roomOrRc, structureType, myOnly = true) {
  const room = roomOrRc.room || roomOrRc;
  const cache = roomOrRc.cache || null;
  
  const findType = myOnly ? FIND_MY_STRUCTURES : FIND_STRUCTURES;
  
  if (cache) {
    // Use cache if available (ControllerRoom)
    return cache.get(`find_${findType}_${structureType}`, () => {
      return room.find(findType).filter(s => s.structureType === structureType);
    });
  } else {
    // Direct find if no cache (Room)
    return room.find(findType, {
      filter: { structureType: structureType }
    });
  }
}

/**
 * Get structures with free capacity for a resource
 * @param {Room|ControllerRoom} roomOrRc - Room or RoomController instance
 * @param {string} resource - Resource type constant
 * @param {number} minCapacity - Minimum free capacity required (default: 0)
 * @returns {Structure[]} Array of structures with free capacity
 */
function getStructuresWithCapacity(roomOrRc, resource, minCapacity = 0) {
  const room = roomOrRc.room || roomOrRc;
  const cache = roomOrRc.cache || null;
  
  const key = `structuresWithCapacity_${resource}_${minCapacity}`;
  
  if (cache) {
    return cache.get(key, () => {
      return room.find(FIND_STRUCTURES, {
        filter: (s) => s.store && s.store.getFreeCapacity(resource) > minCapacity
      });
    });
  } else {
    return room.find(FIND_STRUCTURES, {
      filter: (s) => s.store && s.store.getFreeCapacity(resource) > minCapacity
    });
  }
}

/**
 * Find dropped resources with optional filtering
 * @param {Room|ControllerRoom} roomOrRc - Room or RoomController instance
 * @param {string|null} resourceType - Optional resource type filter (default: null = all)
 * @param {number} minAmount - Minimum amount required (default: 0)
 * @returns {Resource[]} Array of dropped resources
 */
function findDroppedResources(roomOrRc, resourceType = null, minAmount = 0) {
  const room = roomOrRc.room || roomOrRc;
  const cache = roomOrRc.cache || null;
  
  const key = `droppedResources_${resourceType || 'all'}_${minAmount}`;
  
  if (cache) {
    return cache.get(key, () => {
      const allDropped = room.find(FIND_DROPPED_RESOURCES);
      return allDropped.filter(r => {
        if (resourceType && r.resourceType !== resourceType) return false;
        if (r.amount < minAmount) return false;
        return true;
      });
    });
  } else {
    const filter = {};
    if (resourceType) {
      filter.resourceType = resourceType;
    }
    return room.find(FIND_DROPPED_RESOURCES, {
      filter: (r) => {
        if (resourceType && r.resourceType !== resourceType) return false;
        if (r.amount < minAmount) return false;
        return true;
      }
    });
  }
}

module.exports = {
  findStructuresByType,
  getStructuresWithCapacity,
  findDroppedResources,
};
