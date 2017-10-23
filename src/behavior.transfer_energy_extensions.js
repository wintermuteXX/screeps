var Behavior = require("_behavior");
var b = new Behavior("transfer_energy_extensions");

b.when = function (creep, rc) {
  if (creep.energy === 0) return false;
  return rc.getExtensionsNotFull().length;
};

b.completed = function (creep, rc) {
  var ext = creep.getTarget();

  if (creep.energy === 0) return true;
  if (ext && ext.energy === ext.energyCapacity && ext.length === 0) return true;
  if (!ext) return true;

  return false;
};

b.work = function (creep, rc) {

  var ext = creep.getTarget();
  if (ext === null) {
    ext = rc.getExtensionsNotFull();
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