var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_tower");

function findTower(rc) {
  var s = rc.room.tower;
  if ( s && s.energy < s.energyCapacity ) {
    return s;
  }
  return null;
}

b.when = function(creep, rc) {
  if (creep.energy === 0) return false;
  var tower = findTower(rc);
  return (!!tower);
};

b.completed = function(creep, rc) {
  var tower = creep.getTarget();

  if (creep.energy === 0) return true;
  if ( tower && tower.energy === tower.energyCapacity ) return true;

  return false;
};

b.work = function(creep, rc) {
  var tower = creep.getTarget();

  if (tower === null) {
    tower = findTower(rc);
    if ( tower ) {
      creep.target = tower.id;
    }
  }

  if (tower) {
    if (!creep.pos.isNearTo(tower)) {
      creep.moveToEx(tower);
    } else {
      creep.transferEnergy(tower);
    }
  }

};

module.exports = b;
