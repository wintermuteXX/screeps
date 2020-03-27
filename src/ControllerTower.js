function ControllerTower(tower, ControllerRoom) {
    this.tower = tower;
    this.ControllerRoom = ControllerRoom;
}

ControllerTower.prototype.fire = function () {

    /* var allowedNameList = ["lur", "starwar15432", "leonyx", "lisp", "rubra", "thekraken", "apemanzilla", "iskillet"]
    var targetList = this.tower.room.find(FIND_HOSTILE_CREEPS, {
        filter: function(foundCreep) { 
            for (let i=allowedNameList.length;--i>=0;){
                if (foundCreep.owner.username === allowedNameList[i]) return(false);
            }
            return(true);
        }
    });
     */
    var targetList = this.ControllerRoom.getEnemys();
    var closestHostile = this.tower.pos.findClosestByRange(targetList);
    if (closestHostile) {
        this.tower.attack(closestHostile);
    }
};

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