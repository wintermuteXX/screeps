const CONSTANTS = require("./config.constants");
const ResourceManager = require("./service.resource");
const Log = require("./lib.log");

class StructuresManager {
  constructor(roomController) {
    this.rc = roomController;
  }

  /**
   * Find structures that need repair (sorted by hits)
   * @returns {Structure[]} Array of structures
   */
  findStructuresToRepair() {
    return this.rc.cache.get("structuresToRepair", () => {
      const structures = _.filter(this.rc.find(FIND_STRUCTURES), (s) => s.needsRepair());
      return _.sortBy(structures, (s) => s.hits);
    });
  }

  /**
   * Find hostile creeps in the room
   * @returns {Creep[]} Array of hostile creeps
   */
  getEnemies() {
    return this.rc.cache.get("enemies", () => {
      const allowedNameList = ["lur", "starwar15432", "leonyx", "lisp", "rubra", "thekraken", "apemanzilla", "iskillet", "Tada_", "xylist"];
      const allowedSet = new Set(allowedNameList); // O(1) lookup
      return this.rc.room.find(FIND_HOSTILE_CREEPS, {
        filter: (foundCreep) => !allowedSet.has(foundCreep.owner.username),
      });
    });
  }

  /**
   * Build a list of structures that need a resource
   * @param {Structure[]} structures - Structures to evaluate
   * @param {ResourceConstant} resource - Resource type
   * @param {number} prio - Priority value
   * @param {number} threshold - Minimum free capacity
   * @returns {Array} Needs array
   */
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

  /**
   * Adjusts wall hits target based on available energy in terminal
   * Increases wallHits when terminal has excess energy
   */
  /**
   * Adjust wall hits target based on available energy
   * @returns {void}
   */
  adjustWallHits() {
    const {room} = this.rc;
    if (!room.terminal || !room.terminal.my) {
      return null;
    }
    if (ResourceManager.getResourceAmount(room, RESOURCE_ENERGY, "terminal") > room.getRoomThreshold(RESOURCE_ENERGY, "terminal") + 20000) {
      Log.success(`Increased wallHits in ${room}`);
      room.memory.wallHits += CONSTANTS.RESOURCES.WALL_HITS_INCREMENT;
    }
  }
}

module.exports = StructuresManager;

