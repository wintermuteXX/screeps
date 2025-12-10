const Log = require("./lib.log");
const CONSTANTS = require("./config.constants");

class ControllerTower {
  constructor(tower, ControllerRoom) {
    this.tower = tower;
    this.ControllerRoom = ControllerRoom;
  }

  fire() {
    const targetList = this.ControllerRoom.getEnemys();
    if (targetList.length === 0) {
      return;
    }
    
    const closestHostile = this.tower.pos.findClosestByRange(targetList);
    if (closestHostile) {
      this.tower.attack(closestHostile);
    }
  }

  // TODO Create parameter to repair/upgrade even if needsRepair is not true
  repair() {
    // Don't repair if enemies are present
    if (this.ControllerRoom.getEnemys().length > 0) {
      return;
    }
    if (this.tower.store[RESOURCE_ENERGY] <= CONSTANTS.STRUCTURE_ENERGY.TOWER_MIN) {
      return;
    }

    // Use cached structures from ControllerRoom
    const structures = this.ControllerRoom.findStructuresToRepair();
    if (structures.length > 0) {
      this.tower.repair(structures[0]);
    }
  }

  /**
   * Heals damaged own creeps
   * Priority: Most damaged creep first
   */
  heal() {
    // Find all own creeps and filter damaged ones
    // Note: ControllerRoom.find() ignores filter, so filter manually
    const allCreeps = this.ControllerRoom.find(FIND_MY_CREEPS);
    const damagedCreeps = allCreeps.filter((creep) => creep.hits < creep.hitsMax);

    if (damagedCreeps.length === 0) {
      return false;
    }

    // Sort by damage level (most damaged first)
    damagedCreeps.sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));

    // Heile den am meisten verletzten Creep
    const result = this.tower.heal(damagedCreeps[0]);
    
    if (result === OK) {
      Log.debug(`Tower healing ${damagedCreeps[0].name} (${damagedCreeps[0].hits}/${damagedCreeps[0].hitsMax})`, "Tower");
      return true;
    }
    
    return false;
  }
}

module.exports = ControllerTower;
