var Behavior = require("_behavior");

var b = new Behavior("upgrade_controller");

b.when = function (creep, rc) {
  return (rc.getController() !== null && creep.energy > 0);
};

b.completed = function (creep, rc) {
  return (rc.getController() === null || creep.energy === 0);
};

b.work = function (creep, rc) {

 /* var controller = rc.getController();
TODO: Delete
  if (controller !== null) {
    if (!creep.pos.isNearTo(controller)) {
      creep.moveToEx(controller);
    } else {
      creep.upgradeController(controller);
    }
  }
*/

if(creep.room.controller) {
    if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller);
    }
}

};

module.exports = b;
