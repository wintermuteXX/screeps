var Behavior = require("_behavior");

var b = new Behavior("upgrade_controller");

b.when = function (creep, rc) {
  return (rc.getController() !== null && creep.energy > 0);
};

b.completed = function (creep, rc) {
  return (rc.getController() === null || creep.energy === 0);
};

b.work = function (creep, rc) {
  // TODO Scout upgrade controller - check if still exists + my (in case you unclaim controller for a reason)
  
  let target = creep.room.controller;
  if (target) {
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