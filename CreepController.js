function CreepController(roomController) {
  this.roomController = roomController;
  this.config = roomController.gameController.config;
}

CreepController.prototype.run(creep) {
  var config = this.config;

  if ( config != null ) {
      var behavior = null;

      if ( creep.behavior != null ) {
        // creep has current behavior, check if completed
        var b = config.behaviors[behavior];
        if ( !b.completed() ) {
          behavior = b;
        }
      }

      if ( behavior == null ) {
        // no behavior assigned, find new
        for ( var b of config[creep.role].behaviors ) {
          if ( b.when() ) {
            behavior = b;
            break;
          }
        }
      }

      if ( behavior != null ) {
        // send creep to work
        behavior.work(creep, this.roomController);
      }
  }
}

module.exports = CreepController;
