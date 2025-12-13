const Behavior = require("./behavior.base");
const Log = require("./lib.log");

class UpgradeControllerBehavior extends Behavior {
  constructor() {
    super("upgrade_controller");
  }

  when(creep, rc) {
    return rc.room.controller !== null && creep.store[RESOURCE_ENERGY] > 0;
  }

  completed(creep, rc) {
    const {controller} = rc.room;
    return creep.store[RESOURCE_ENERGY] === 0 || controller === null || controller === undefined || controller.my === false;
  }

  work(creep, rc) {
    const target = rc.room.controller;
    if (target && target.my) {
      const result = creep.upgradeController(target);

      switch (result) {
        case OK:
          break;
        case ERR_NOT_IN_RANGE:
          creep.travelTo(target);
          break;
        default:
          Log.warn(`${creep} has unknown result from upgradeController(${target}): ${global.getErrorString(result)}`, "upgrade_controller");
      }
    }
  }
}

module.exports = new UpgradeControllerBehavior();
