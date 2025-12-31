const CONSTANTS = require("./config.constants");

class StructuresManager {
  constructor(roomController) {
    this.rc = roomController;
  }

  findStructuresToRepair() {
    return this.rc.cache.get("structuresToRepair", () => {
      const structures = _.filter(this.rc.find(FIND_STRUCTURES), (s) => s.needsRepair());
      return _.sortBy(structures, (s) => s.hits);
    });
  }

  getEnemys() {
    return this.rc.cache.get("enemies", () => {
      const allowedNameList = ["lur", "starwar15432", "leonyx", "lisp", "rubra", "thekraken", "apemanzilla", "iskillet", "Tada_", "xylist"];
      const allowedSet = new Set(allowedNameList); // O(1) lookup
      return this.rc.room.find(FIND_HOSTILE_CREEPS, {
        filter: (foundCreep) => !allowedSet.has(foundCreep.owner.username),
      });
    });
  }

  structuresNeedResource(structures, resource, prio, threshold) {
    // Filter out null/undefined structures and those with enough resources
    const filtered = _.filter(structures, (s) => s && s.store && s.store.getFreeCapacity(resource) > (threshold || 0));

    return _.map(filtered, (s) => {
      return {
        priority: prio,
        structureType: s.structureType,
        resourceType: resource,
        amount: s.store.getFreeCapacity(resource),
        id: s.id,
      };
    });
  }

  /**
   * Finds a link near the specified object
   * @param {RoomObject} obj - The object to search near
   * @param {Object} options - Optional parameters
   * @param {string} options.linkType - Type of links to search: 'all', 'receivers', or 'senders' (default: 'all')
   * @param {boolean} options.requireEnergy - If true, only return links with energy > 0 (default: false)
   * @returns {StructureLink|null} The nearest link or null
   */
  findNearLink(obj, options = {}) {
    const { linkType = 'all', requireEnergy = false } = options;
    
    let links;
    if (linkType === 'receivers') {
      links = this.rc.links.receivers;
    } else if (linkType === 'senders') {
      links = this.rc.links.senders;
    } else {
      links = this.rc.room.links;
    }
    
    const nearbyLinks = obj.pos.findInRange(links, 3);
    
    if (nearbyLinks.length === 0) {
      return null;
    }
    
    // If energy is required, find first link with energy
    if (requireEnergy) {
      for (const link of nearbyLinks) {
        if (link.energy > 0) {
          return link;
        }
      }
      return null;
    }
    
    return nearbyLinks[0];
  }
}

module.exports = StructuresManager;

