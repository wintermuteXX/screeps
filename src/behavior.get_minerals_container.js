var Behavior = require("_behavior");

var b = new Behavior("get_minerals_container");

b.when = function (creep, rc) {
  var containers = rc.getMineralContainer();
  return (_.sum(creep.carry) === 0 && containers);
}

b.completed = function (creep, rc) {
  var target = Game.getObjectById(creep.target);
  return (target === null || _.sum(creep.carry) > 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();
  if (target === null) {
    target = rc.getMineralContainer();
    if (target) {
    creep.target = target.id;
    console.log("Target ID: " + target.id + " Creep.target: " + creep.target);
    }
  }

  if (target !== null) {
    if (!creep.pos.isNearTo(target)) {
      creep.moveTo(target);
    } else {
      creep.withdrawAllResources(target);
      creep.target = null;
    }
  }
};

module.exports = b;
