function CreepController(roomController) {
	this.roomController = roomController;
	this.config = roomController.config;
}

 /**
 * CreepController.run(creep)
 */
CreepController.prototype.run = function(creep) {
	// if  ( creep.fatigue > 0 ) return;

	var config = this.config;
	if (config !== null) {
		var behavior = null;
		var b = null;

		if (creep.behavior !== null) {
			// creep has current behavior, check if completed
			b = config.behaviors[behavior];
			if (!b.completed(creep, this.roomController)) {
				behavior = b;
			} else {
				creep.target = null;
			}
		}

		if (behavior === null) {
			// no behavior assigned, find new
			var behaviors = config.getCreepBehaviors(creep.role);

			for (var i in behaviors) {
				b = behaviors[i];
				if (b.when(creep, this.roomController)) {
					behavior = b;
					break;
				}
			}
		}

		if (behavior !== null) {
			// send creep to work
			behavior.work(creep, this.roomController);
		}
	}
};

module.exports = CreepController;
