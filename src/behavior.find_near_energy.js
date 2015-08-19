var Behavior = require("_behavior");

var RANGE_TO_ENERGY = 2;

function findEnergy(obj, rc) {
  var dropped = rc.find(FIND_DROPPED_ENERGY);
  return obj.pos.findInRange(dropped, RANGE_TO_ENERGY);
}

function findNearLink(obj, rc) {
  var links = rc.links.receivers;
  return obj.pos.findInRange(links, 3);
}

function findStorage(obj, rc) {
  var store = rc.room.storage;
    return obj.pos.findInRange(store,3);
} 

var b = new Behavior("find_near_energy");
// Prüfung muss noch um Controller ergänzt werden
b.when = function(creep, rc) {
  if (creep.energy === 0) {
    var controller = rc.getController();
    var energy = findEnergy(controller, rc);
    var link = findNearLink(controller, rc);
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
  var controller = rc.getController();
  if (!energy) {
    var dropped = findEnergy(controller, rc);
    if (dropped.length) {
      energy = dropped[0];
      creep.target = energy.id;
    }
  }

  if (!energy) {
    energy = findNearLink(controller, rc);
    console.log("Energy.length link: " + energy.length);
    if (energy.length) {
      energy = energy[0];
      creep.target = energy.id;
    } else {
      energy = null;
    }
  }

if (!energy) {
    energy = findStorage(controller, rc);
    console.log("Energy.length stor: " + energy.length);
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
