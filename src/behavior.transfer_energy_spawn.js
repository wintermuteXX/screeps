var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_spawn");

b.when = function(creep, rc) {
  if (creep.energy === 0) return false;

  var spawn = _.find(rc.find(FIND_MY_SPAWNS), function(s) {
    return (s.energy < s.energyCapacity);
  });

  return !!spawn;
};

b.completed = function(creep, rc) {
  var spawn = Game.getObjectById(creep.target);

  if (creep.energy === 0) return true;
  if (spawn && spawn.energy === spawn.energyCapacity) return true;
  if (!spawn) return true;

  return false;
};

b.work = function(creep, rc) {
  var spawn = Game.getObjectById(creep.target);

  if (spawn === null) {
    var spawns = rc.find(FIND_MY_SPAWNS);
    if (spawns.length) {
      spawn = spawns[0];
      creep.target = spawn.id;
    }
  }

  if (spawn) {
    if (!creep.pos.isNearTo(spawn)) {
      creep.moveToEx(spawn);
    } else {
      creep.transferEnergy(spawn);
    }
  }

};

module.exports = b;
