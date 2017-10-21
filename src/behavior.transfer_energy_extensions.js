var Behavior = require("_behavior");
var b = new Behavior("transfer_energy_extensions");

b.when = function (creep, rc) {
  if (creep.energy === 0) return false;

  var emptyExtensions = _.filter(creep.room.find(FIND_MY_STRUCTURES), function (s) {
    if (s.structureType === STRUCTURE_EXTENSION) {
      return s.energy < s.energyCapacity;
    }
  });
  console.log("emptyExtensions:    " + emptyExtensions);
  console.log("getExtensionsEmpty: " + rc.getExtensionsEmpty());

  var ext = emptyExtensions;
  if (emptyExtensions) {
    return emptyExtensions.length > 0;
  }
  return false;
};

b.completed = function (creep, rc) {
  var ext = creep.getTarget();

  if (creep.energy === 0) return true;
  if (ext && ext.energy === ext.energyCapacity) return true;
  if (!ext) return true;

  return false;
};

b.work = function (creep, rc) {
  var ext = creep.getTarget();

  if (ext === null) {
    ext = _.filter(creep.room.find(FIND_MY_STRUCTURES), function (s) {
      if (s.structureType === STRUCTURE_EXTENSION) {
        return s.energy < s.energyCapacity;
      }
    });

    if (ext.length) {
      ext = creep.pos.findClosestByRange(ext);
      creep.target = ext.id;
    }
  }

  if (ext) {
    if (!creep.pos.isNearTo(ext)) {
      creep.travelTo(ext);
    } else {
      creep.transfer(ext, RESOURCE_ENERGY);
      creep.target = null;
    }
  }

};

module.exports = b;