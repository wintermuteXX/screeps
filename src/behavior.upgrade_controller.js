var Behavior = require("_behavior");

var b = new Behavior("upgrade_controller");

b.when = function (creep, rc) {
  return (rc.getController() !== null && creep.energy > 0);
};

b.completed = function (creep, rc) {
  return (rc.getController() === null || creep.energy === 0);
};

b.work = function (creep, rc) {

if(creep.room.controller) {
    if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.travelTo(creep.room.controller);
    }
}

};

module.exports = b;
