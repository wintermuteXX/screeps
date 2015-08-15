var Behavior = require("_behavior");

var b = new Behavior("goto_white_flag");

function findFlag(rc) {
    return _.find(Game.flags, {
      'color': COLOR_WHITE
    });
}

b.when = function(creep, rc) {
  var flag = findFlag(rc);
  return !!flag && flag.room !== creep.room;
};

b.completed = function(creep, rc) {
  var flag = findFlag(rc);
  return !flag || flag.room === creep.room;
};

b.work = function(creep, rc) {
  var flag = findFlag(rc);
  if (flag) {
    creep.moveToEx(flag);
  }
};

module.exports = b;
