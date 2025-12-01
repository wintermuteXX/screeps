const Behavior = require("_behavior");

const b = new Behavior("claim_controller");

b.when = function (creep, rc) {
  return (creep.room.controller && !creep.room.controller.my);
};

b.completed = function (creep, rc) {
  return (creep.room.controller.my);
};

b.work = function (creep, rc) {
  if (creep.pos.isNearTo(creep.room.controller)) {
    creep.claimController(creep.room.controller);
  } else {
    creep.travelTo(creep.room.controller);
  }
};

module.exports = b;