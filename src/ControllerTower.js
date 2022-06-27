function ControllerTower(tower, ControllerRoom) {
    this.tower = tower;
    this.ControllerRoom = ControllerRoom;
}

ControllerTower.prototype.fire = function () {

    var targetList = this.ControllerRoom.getEnemys();
    var closestHostile = this.tower.pos.findClosestByRange(targetList);
    if (closestHostile) {
        this.tower.attack(closestHostile);
    }
};

// TODO Create parameter to repair/upgrade even if needsRepair is not true
ControllerTower.prototype.repair = function () {

    var targetList = this.ControllerRoom.getEnemys();
    if (targetList.length === 0) {

        var structures = _.filter(this.tower.room.find(FIND_STRUCTURES), function (s) {
            return s.needsRepair();
        });

        structures = _.sortBy(structures, function (s) {
            return s.hits;
        });

        if (structures.length && this.tower.energy > 500) {
            this.tower.repair(structures[0]);
        };
    };
}

// TODO Create Prototype heal
module.exports = ControllerTower;