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

  findNearLink(obj) {
    const allLinks = this.rc.room.links;
    const thelink = obj.pos.findInRange(allLinks, 3);
    if (thelink.length > 0) {
      return thelink[0];
    }
    return null;
  }
}

module.exports = StructuresManager;

