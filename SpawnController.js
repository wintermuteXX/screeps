function SpawnController(spawn, roomController) {
  this.spawn = spawn;
  this.roomController = roomController;
}

SpawnController.prototyp.idle = function() {
    return ( this.spawn.spawning == null );
}

SpawnController.prototyp.create = function(role, creepConfig) {
    var name = role;

    var body = [];

    if ( this.spawn.canCreateCreap(body, name) ) {
      var result = this.spawn.createCreep(body, name, {
          'role' : role
      });
    }

}

module.exports = SpawnController;
