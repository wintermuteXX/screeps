var Behavior = require("_behavior");

var RANGE_TO_ENERGY = 2;

function findEnergy(obj, rc) {
  var dropped = rc.find(FIND_DROPPED_ENERGY);
  return obj.pos.findInRange(dropped, RANGE_TO_ENERGY);
}

function findNearLink(obj, rc) {
  var links = rc.links.receivers;
  var thelink = obj.pos.findInRange(links, 3);
  if (thelink && (thelink.energy != 0))
  return thelink;
}

function findStorage(obj, rc) {
  var store = rc.room.storage;
  if ( !!store ) {
    var thestorage =  obj.pos.findInRange([store],3);
    // console.log("TheStorage: " + thestorage + " | rs " + rc.room.storage.store.energy);
    // console.log(JSON.stringify(thestorage));
    if (thestorage && rc.room.storage.store.energy > 8000) return thestorage;
  }
  return null;
} 

var b = new Behavior("find_near_energy");

b.when = function(creep, rc) {
  if (creep.energy === 0) {
    var controller = rc.getController();
    var energy = findEnergy(controller, rc);
    var link = findNearLink(controller, rc);
    var storage = findStorage(controller, rc);
    return (energy.length > 0 || link || storage);
  }
  return false;
};
b.completed = function(creep, rc) {
  var target = creep.getTarget();

  if (creep.energy > 0 || !target) return true;
  // console.log('Structure: ' + target);
  if (target && target.structureType) {
  //  console.log("Structure Energy: " + target.energy);
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
  if (energy.length && energy[0].energy > 0 ) {
      energy = energy[0];
      creep.target = energy.id;
    } else {
      energy = null;
    }
  }

if (!energy) {
    energy = findStorage(controller, rc);
     if (energy && energy.length) {
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
        creep.withdraw(energy,RESOURCE_ENERGY);
      } else {
        creep.pickup(energy);
            }
    }
  }
};
module.exports = b;
