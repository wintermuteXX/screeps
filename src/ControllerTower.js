function ControllerTower(tower, ControllerRoom) {
    this.tower = tower;
    this.ControllerRoom = ControllerRoom;
}

ControllerTower.prototype.fire = function () {
    const targetList = this.ControllerRoom.getEnemys();
    if (targetList.length === 0) return;
    
    const closestHostile = this.tower.pos.findClosestByRange(targetList);
    if (closestHostile) {
        this.tower.attack(closestHostile);
    }
};

// TODO Create parameter to repair/upgrade even if needsRepair is not true
const CONSTANTS = require("constants");

ControllerTower.prototype.repair = function () {
    // Don't repair if enemies are present
    if (this.ControllerRoom.getEnemys().length > 0) return;
    if (this.tower.store[RESOURCE_ENERGY] <= CONSTANTS.STRUCTURE_ENERGY.TOWER_MIN) return;

    // Use cached structures from ControllerRoom
    const structures = this.ControllerRoom.findStructuresToRepair();
    if (structures.length > 0) {
        this.tower.repair(structures[0]);
    }
}

// TODO Create Prototype heal
module.exports = ControllerTower;