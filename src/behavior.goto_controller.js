var Behavior = require("_behavior");
var b = new Behavior("goto_controller");
b.when = function (creep, rc) {
  var c = rc.getController();
  return !creep.pos.inRangeTo(c, 3);
};
b.completed = function (creep, rc) {
  var c = rc.getController();
  return creep.pos.inRangeTo(c, 2);
};
b.work = function (creep, rc) {
  creep.travelTo(rc.getController());
};
module.exports = b;
