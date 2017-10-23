var Behavior = require("_behavior");

var b = new Behavior("harvest");

b.when = function (creep, rc) {
  return (creep.energy === 0);
};

b.completed = function (creep, rc) {
  var sourceEnergy = creep.getTarget();
  console.log("SourceEnergy: " + sourceEnergy);
  return (creep.energy === creep.energyCapacity);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (target === null) {
       var sources = rc.getSourcesNotEmpty();
    if (sources.length) {
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
