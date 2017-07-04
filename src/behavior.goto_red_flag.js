var Behavior = require("_behavior");

var b = new Behavior("goto_red_flag");

function findFlag(rc) {
  return _.find(Game.flags, {
    'color': COLOR_RED
  });
}

b.when = function (creep, rc) {
  var flag = findFlag(rc);
  return !!flag && flag.room !== creep.room;
};

b.completed = function (creep, rc) {
  var flag = findFlag(rc);
  return !flag || flag.pos === creep.pos;
};

b.work = function (creep, rc) {
  var flag = findFlag(rc);
  if (flag) {
    creep.travelTo(flag, { ignoreDestructibleStructures: true });
  }
};

module.exports = b;