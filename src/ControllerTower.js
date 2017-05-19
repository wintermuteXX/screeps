function ControllerTower(tower, ControllerRoom) {
  this.tower = tower;
  this.ControllerRoom = ControllerRoom;
}

ControllerTower.prototype.fire = function() {
var closestHostile = this.tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if(closestHostile) {
        this.tower.attack(closestHostile);
    }
};

module.exports = ControllerTower;