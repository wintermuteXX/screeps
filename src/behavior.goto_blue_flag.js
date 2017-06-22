var Behavior = require("_behavior");

var _cache = {};

function findFlag(rc) {
  if (!_cache[rc.room.name]) {
    _cache[rc.room.name] = _.find(rc.find(FIND_FLAGS, { 'color': COLOR_BLUE }));
  }
  return _cache[rc.room.name];
}

var b = new Behavior("goto_blue_flag");

b.when = function (creep, rc) {
  var flag = findFlag(rc);
  return !!flag && !creep.pos.inRangeTo(flag, 2);
};
b.completed = function (creep, rc) {
  var flag = findFlag(rc);
  return !flag || creep.pos.inRangeTo(flag, 2);
};
b.work = function (creep, rc) {
  var flag = findFlag(rc);
  if (flag) {
    creep.moveToEx(flag);
  }
};
module.exports = b;
