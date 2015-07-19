var Behavior = require("_behavior");

var RANGE_TO_ENERGY = 2;

function findEnergy(creep, rc) {
  var dropped = rc.find(FIND_DROPPED_ENERGY);
  return creep.pos.findInRange(dropped, RANGE_TO_ENERGY);
}

function findNearLink(creep, rc) {
  var links = rc.links.receivers;

  return creep.pos.findInRange(links, 2);
}

var b = new Behavior("find_near_energy");
b.when = function(creep, rc) {
  if (creep.energy === 0) {
    var energy = findEnergy(creep, rc);
    var link = findNearLink(creep, rc);
    return (energy.length > 0 || link);
  }
  return false;
};
b.completed = function(creep, rc) {
  var target = creep.getTarget();

  if (creep.energy > 0 || !target) return true;
  if (target && target.structureType) {
    return target.energy === 0;
  }

  return false;
};
b.work = function(creep, rc) {
  var energy = creep.getTarget();

  if (!energy) {
    var dropped = findEnergy(creep, rc);
    if (dropped.length) {
      energy = dropped[0];
      creep.target = energy.id;
    }
  }

  if (!energy) {
    energy = findNearLink(creep, rc);
    if (energy.length) {
      energy = energy[0];
      creep.target = energy.id;
    } else {
      energy = null;
    }
  }

  if (energy) {
    if (!creep.pos.isNearTo(energy)) {
      creep.moveToEx(energy);
    } else {
      if (energy.structureType) {
        energy.transferEnergy(creep);
      } else {
        creep.pickup(energy);
      }
    }
  }
};
module.exports = b;
