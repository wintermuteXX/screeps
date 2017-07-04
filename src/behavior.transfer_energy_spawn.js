var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_spawn");

function findEmptySpawn(rc) {
  return _.find(rc.find(FIND_MY_SPAWNS), function (s) {
    return (s.energy < s.energyCapacity);
  });
}

b.when = function (creep, rc) {
  if (creep.energy === 0) return false;
  var spawn = findEmptySpawn(rc);
  return !!spawn;
};

b.completed = function (creep, rc) {
  var spawn = Game.getObjectById(creep.target);

  if (creep.energy === 0) return true;
  if (spawn && spawn.energy === spawn.energyCapacity) return true;
  if (!spawn) return true;

  return false;
};

b.work = function (creep, rc) {
  var spawn = Game.getObjectById(creep.target);

  if (spawn === null) {
    spawn = findEmptySpawn(rc);
    if (spawn) {
      creep.target = spawn.id;
    }
  }

  if (spawn) {
    if (!creep.pos.isNearTo(spawn)) {
      creep.travelTo(spawn);
    } else {
      creep.transfer(spawn, RESOURCE_ENERGY);
    }
  }

};

module.exports = b;
