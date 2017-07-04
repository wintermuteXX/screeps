function ControllerTower(tower, ControllerRoom) {
    this.tower = tower;
    this.ControllerRoom = ControllerRoom;
}

ControllerTower.prototype.fire = function () {
    var closestHostile = this.tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (closestHostile) {
        this.tower.attack(closestHostile);
    }
};

ControllerTower.prototype.repair = function () {
  
   var structures = _.filter(this.tower.room.find(FIND_STRUCTURES), function (s) {
    return s.needsRepair();
  }); 
  structures = _.sortBy(structures, function (s) {
    return s.hits;
  });

   if (structures.length && this.tower.energy > 500) {
       this.tower.repair(structures[0]);
};
}

module.exports = ControllerTower;