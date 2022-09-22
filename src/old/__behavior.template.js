var Behavior = require("_behavior");

var b = new Behavior("name");

b.when = function (creep, rc) {
  return true;
};

b.completed = function (creep, rc) {
  return false;
};

b.work = function (creep, rc) {

};

module.exports = b;
