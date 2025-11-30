var Behavior = require("_behavior");
const CONSTANTS = require("./constants");

var b = new Behavior("goto_home");

b.when = function (creep, rc) {
  return creep.room.name !== creep.memory.home;
};

b.completed = function (creep, rc) {
  const { BORDER_MIN, BORDER_MAX } = CONSTANTS.ROOM;
  return creep.room.name == creep.memory.home && 
         creep.pos.x > BORDER_MIN && creep.pos.x < BORDER_MAX && 
         creep.pos.y > BORDER_MIN && creep.pos.y < BORDER_MAX;
};

b.work = function (creep, rc) {
  if (creep.memory.home) {
    creep.travelTo(new RoomPosition(25, 25, creep.memory.home), {
      preferHighway: true,
    });
  }
};

module.exports = b;
