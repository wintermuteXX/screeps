var Behavior = require("_behavior");
var b = new Behavior("goto_white_flag");

function findFlag(rc) {
  return _.find(Game.flags, {
    'color': COLOR_WHITE
  });
}

b.when = function (creep, rc) {
  var flag = findFlag(rc);
  return !!flag && flag.room !== creep.room;
};

b.completed = function (creep, rc) {
  var flag = findFlag(rc);
  return !flag || (flag.room === creep.room && creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49);
};

b.work = function (creep, rc) {
  var flag = findFlag(rc);
  if (flag) {
    creep.travelTo(flag, {
      preferHighway: true
    });
  }
};

module.exports = b;