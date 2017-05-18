var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_tower");

b.when = function(creep, rc) {
  creep.say('En. > Tow.');
  if (creep.energy === 0) return false;
  
  var tower = global.Cache.rooms[creep.room.name].emptytowers[0];
  return (!!tower);
};

b.completed = function(creep, rc) {
  var tower = creep.getTarget();
  if (creep.energy === 0) return true;
  if ( tower && tower.energy === tower.energyCapacity ) return true;
    // console.log("t energy: " + tower.energy + " | t capac: " + tower.energyCapacity);
    if ( !tower ) return true;
  return false;
};

b.work = function(creep, rc) {
  var tower = creep.getTarget();

  if (tower === null) {
    var tower = global.Cache.rooms[creep.room.name].emptytowers[0];
    if ( tower ) {
      creep.target = tower.id;
    }
  }

  if (tower) {
    if (!creep.pos.isNearTo(tower)) {
      creep.moveToEx(tower);
    } else {
      creep.transfer(tower,RESOURCE_ENERGY);
      creep.target = null;
    }
  }

};

module.exports = b;
