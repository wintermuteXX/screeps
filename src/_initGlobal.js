
function initGlobal(g) {

  g.killAll = function() {
    for ( var c in Game.creeps ) {
      Game.creeps[c].suicide();
    }
  };

  /**
   * Intervals
   */

  g._intervals = {
    'checkPopulation': 10,
		'checkConstructions': 100,
    'checkLinks' : 5
  };

  g.getInterval = function(key){
    if ( key && this._intervals[key] ) {
      return this._intervals[key];
    }
    return 0;
  };


  /**
   * Behaviors
   */

  g._behaviors = {};

  g.getBehavior = function(key){
    return this._registerBehavior(key);
  };

  g._registerBehavior = function(n) {
    if ( !n ) return null;

    if ( !g._behaviors[n] ) {
      try {
        g._behaviors[n] = require("behavior." + n);
      } catch ( e ) {
        console.log("Error loading behavior '" + n + "'", e);
        g._behaviors[n] = null;
      }
    }

    return g._behaviors[n] || null;
  };

  /**
   * Global Config
   */
  // g._globalConfig = require("config.global");
  // g.initRoom = function(rc){
  //  g._globalConfig.rooms.init(rc);
  // };

  /**
   * Creeps
   */
  g._creeps = require("config.creeps");

  g.getCreepConfig = function(role) {
      if ( role && this._creeps[role] ) {
          return this._creeps[role];
      }
      return null;
  };

  g.getCreepsConfig = function() {
    return this._creeps;
  };

  g.getCreepRoles = function() {
		var creepsConfig = this.creeps;
		return _.sortBy(Object.keys(this._creeps), function(r) {
			return global._creeps[r].priority || 999;
		});
	};

}

module.exports = initGlobal;
