const creepsConfig = require("config.creeps");

/**
 * Creep configuration utilities
 */
function createCreepConfigUtils() {
  /**
   * Get creep config for a specific role
   * @param {string} role - Creep role
   * @returns {Object|null} Creep config or null
   */
  function getCreepConfig(role) {
    if (role && creepsConfig[role]) {
      return creepsConfig[role];
    }
    return null;
  }

  /**
   * Get all creep configs
   * @returns {Object} All creep configs
   */
  function getCreepsConfig() {
    return creepsConfig;
  }

  /**
   * Get all creep roles sorted by priority
   * @returns {Array<string>} Array of role names
   */
  function getCreepRoles() {
    return _.sortBy(Object.keys(creepsConfig), function (r) {
      return creepsConfig[r].priority || 999;
    });
  }

  return {
    getCreepConfig,
    getCreepsConfig,
    getCreepRoles
  };
}

module.exports = createCreepConfigUtils;

