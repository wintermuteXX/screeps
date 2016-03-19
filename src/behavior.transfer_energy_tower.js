var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_tower");

function findTower(rc,creep) {
    var roomCache = global.Cache.rooms[creep.room.name];
 if ( roomCache ) {
     var tower = roomCache.towers;
     if ( tower ) {
         return tower[0];
     }
 }
 return false;
};
  //var s = rc.room.tower;
  //console.log("Tower: " + s);
  //if ( s && s.energy < s.energyCapacity ) {
  //  return s;
  //}
  //return null;
//}

b.when = function(creep, rc) {
  if (creep.energy === 0) return false;
  // var tower = findTower(rc,creep);
  var tower = global.Cache.rooms[creep.room.name].towers[0];
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
    // tower = findTower(rc);
    var tower = global.Cache.rooms[creep.room.name].towers[0];
    if ( tower ) {
      creep.target = tower.id;
    }
  }

  if (tower) {
    if (!creep.pos.isNearTo(tower)) {
      creep.moveToEx(tower);
    } else {
      creep.transferEnergy(tower);
      creep.target = null;
    }
  }

};

module.exports = b;
