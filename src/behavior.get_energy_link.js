var Behavior = require("_behavior");

var b = new Behavior("get_energy_link");

function findLinks(rc) {
  return _.filter(rc.links.receivers, function (s) {
    return s.energy > 0;
  });
}

// Evtl noch nach dem nächsten Link suchen findClosestByRange

b.when = function (creep, rc) {
  var links = findLinks(rc);
  return (creep.energy === 0 && links[0]);
};

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || creep.energy > 0 || target.energy === 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();
  if (target === null) {
    var links = findLinks(rc);
    var link = creep.pos.findClosestByRange(links);
    creep.target = link.id;
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      creep.withdraw(target, RESOURCE_ENERGY);
      creep.target = null;
    }
  }

};

module.exports = b;
