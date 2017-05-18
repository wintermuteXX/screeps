function ControllerTower(tower, ControllerRoom) {
  this.tower = tower;
  this.ControllerRoom = ControllerRoom;
}

ControllerTower.prototype.fire = function() {
console.log("Fire")
};

module.exports = ControllerTower;