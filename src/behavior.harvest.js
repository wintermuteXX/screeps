var Behavior = require("_behavior");

var b = new Behavior("harvest");

b.when = function (creep, rc) {
  var sources = rc.getSourcesNotEmpty();
  return (creep.energy === 0 && sources.length > 0);
};

b.completed = function (creep, rc) {
  if (!creep.getTarget()) return false;
  if (creep.getTarget().energy == 0) return true;
  return (creep.energy === creep.store.getCapacity(RESOURCE_ENERGY));
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (target === null) {
    var sources = rc.getSourcesNotEmpty();
    if (sources.length) {
      // TODO Only choose source with enough space around      
      // Source per Zufall auswählen
      target = sources[Math.floor(Math.random() * sources.length)];
    }
  }

  if (target !== null) {
    creep.target = target.id;
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      creep.harvest(target);
    }
  }
};

module.exports = b;