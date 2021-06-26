var Behavior = require("_behavior");

var b = new Behavior("upgrade_controller");

b.when = function (creep, rc) {
  return (rc.controller !== null && creep.energy > 0);
};

b.completed = function (creep, rc) {
  let controller = rc.controller
  return (creep.energy === 0 || controller === null || controller.my == false);
};

b.work = function (creep, rc) {

  let target = rc.controller;
  if (target && target.my) {
    let result = creep.upgradeController(target);

    switch (result) {
      case OK:
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(target);
        break;

      default:
        console.log(`unknown result from (creep ${creep}).upgradeController(${target}): ${result}`);
    }
  }
};

module.exports = b;