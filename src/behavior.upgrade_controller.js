var Behavior = require("behavior.base");

var b = new Behavior("name");

b.when = function(creep, rc) {
  return (rc.getController() !== null && creep.energy > 0);
};

b.completed = function(creep, rc) {
  return (rc.getController() === null || creep.energy === 0);
};

b.work = function(creep, rc) {
  var controller = rc.getController();

  if ( controller !== null ) {
    if ( !creep.pos.isNearTo(controller) ) {
      creep.moveToEx(controller);
    } else {
      creep.upgradeController(controller);
    }
  }

};

module.exports = b;
