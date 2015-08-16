var Behavior = require("_behavior");

var b = new Behavior("claim_controller");

b.when = function(creep, rc) {
  return ( creep.room.controller && !creep.room.controller.my);
};

b.completed = function(creep, rc) {
  return (creep.room.controller.my);
};

b.work = function(creep, rc) {
  creep.moveTo(creep.room.controller);
  creep.claimController(creep.room.controller);
};

module.exports = b;
