const Log = require("Log");

/**
 * Behavior registry system
 * Manages loading and caching of behavior modules
 */
function createBehaviorRegistry() {
  const _behaviors = {};

  /**
   * Get a behavior by key
   * @param {string} key - Behavior key
   * @returns {Object|null} Behavior object or null
   */
  function getBehavior(key) {
    return _registerBehavior(key);
  }

  /**
   * Register a behavior (lazy loading)
   * @param {string} n - Behavior name
   * @returns {Object|null} Behavior object or null
   */
  function _registerBehavior(n) {
    if (!n) return null;

    if (!_behaviors[n]) {
      try {
        // Check if behavior name contains parameters (e.g., "goto_flag:red")
        let moduleName = n;
        if (n.indexOf(":") !== -1) {
          moduleName = n.split(":")[0];
        }
        
        const behaviorModule = require("behavior." + moduleName);
        
        // If module is a function (factory), call it with the behavior name
        if (typeof behaviorModule === "function") {
          _behaviors[n] = behaviorModule(n);
        } else {
          // Otherwise, use the module directly
          _behaviors[n] = behaviorModule;
        }
      } catch (e) {
        Log.error(`Error loading behavior '${n}': ${e}`, "Behavior");
        _behaviors[n] = null;
      }
    }

    return _behaviors[n] || null;
  }

  return {
    getBehavior,
    _registerBehavior
  };
}

module.exports = createBehaviorRegistry;

