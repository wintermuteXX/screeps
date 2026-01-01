const Log = require("./lib.log");
const CONSTANTS = require("./config.constants");

class ControllerTower {
  constructor(rc) {
    this.room = rc;
    this.towers = rc.room.towers;
  }

  /**
   * Fire at closest enemy
   * @param {StructureTower} tower - The tower to operate
   */
  _fire(tower) {
    const targetList = this.room.getEnemys();
    if (targetList.length === 0) {
      return;
    }

    const closestHostile = tower.pos.findClosestByRange(targetList);
    if (closestHostile) {
      tower.attack(closestHostile);
    }
  }

  /**
   * Repairs structures
   * @param {StructureTower} tower - The tower to operate
   */
  _repair(tower) {
    // Don't repair if enemies are present
    if (this.room.getEnemys().length > 0) {
      return;
    }
    if (tower.store[RESOURCE_ENERGY] <= CONSTANTS.STRUCTURE_ENERGY.TOWER_MIN) {
      return;
    }

    // Use cached structures from ControllerRoom
    const structures = this.room.findStructuresToRepair();
    if (structures.length > 0) {
      tower.repair(structures[0]);
    }
  }

  /**
   * Heals damaged own creeps
   * Priority: Most damaged creep first
   * @param {StructureTower} tower - The tower to operate
   */
  _heal(tower) {
    // Find all own creeps and filter damaged ones
    // Note: ControllerRoom.find() ignores filter, so filter manually
    const allCreeps = this.room.find(FIND_MY_CREEPS);
    const damagedCreeps = allCreeps.filter((creep) => creep.hits < creep.hitsMax);

    if (damagedCreeps.length === 0) {
      return false;
    }

    // Sort by damage level (most damaged first)
    damagedCreeps.sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));

    // Heile den am meisten verletzten Creep
    const result = tower.heal(damagedCreeps[0]);

    if (result === OK) {
      return true;
    }

    return false;
  }

  /**
   * Runs all tower operations for all towers (fire, heal, and optionally repair)
   * @param {boolean} shouldRepair - Whether to perform repair operations
   */
  run(shouldRepair) {
    for (const tower of this.towers) {
      this._fire(tower);
      this._heal(tower);
      if (shouldRepair) {
        this._repair(tower);
      }
    }
  }
}

module.exports = ControllerTower;
