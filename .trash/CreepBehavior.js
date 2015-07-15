function Behavior(name, options) {
  this.name = name;
  this.options = options || {};
}

Behavior.prototype.when = function(creep, roomController) {
  if (this.options.when) {
    this.options.when.apply(this.options, creep, roomController);
  }
  return false;
}

Behavior.prototype.completed = function(creep, roomController) {
  if (this.options.completed) {
    this.options.completed.apply(this.options, creep, roomController);
  }
  return true;
}

Behavior.prototype.work = function(creep, roomController) {
  if (this.options.work) {
    this.options.work.apply(this.options, creep, roomController);
  }
}
