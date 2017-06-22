module.exports = (function () {
  var Behavior = function (name) {
    this.name = name;
  };

  Behavior.prototype.when = function () { return false; };

  Behavior.prototype.completed = function () { return true; };

  Behavior.prototype.work = function () { };

  return Behavior;
}());
