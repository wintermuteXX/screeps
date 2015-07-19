var Behavior = require("_behavior");
var b = new Behavior("transfer_energy_upgrader");

b.when = function(creep, rc) {
  return (creep.energy > 0 && rc.getCreeps('upgrader').length);
};
b.completed = function(creep, rc) {
  return (creep.energy === 0);
};
b.work = function(creep, rc) {
  var controller = creep.getTarget();

  if (!controller) {
    controller = rc.getController();
    creep.target = controller.id;
  }

  if (controller) {
    if (!creep.pos.inRangeTo(controller, 2)) {
      creep.moveToEx(controller);
    } else {
      creep.dropEnergy();
    }
  }
};
module.exports = b;
