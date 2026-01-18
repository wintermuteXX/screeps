const creepsConfig = require("./config.creeps");
const Log = require("./lib.log");

/**
 * Creep configuration utilities
 */

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
  return _.sortBy(Object.keys(creepsConfig), (r) => {
    return creepsConfig[r].priority || 999;
  });
}

/**
 * Validate creep configs once per global reset
 * Logs issues for missing or inconsistent fields
 * @returns {boolean} True when no issues were found
 */
function validateCreepConfigs() {
  const requiredKeys = ["priority", "minParts", "behaviors", "canBuild"];
  let hasIssues = false;

  for (const [role, cfg] of Object.entries(creepsConfig)) {
    if (!cfg || typeof cfg !== "object") {
      Log.warn(`Creep config for role "${role}" is not an object`, "config.creeps");
      hasIssues = true;
      continue;
    }

    for (const key of requiredKeys) {
      if (!(key in cfg)) {
        Log.warn(`Creep config for role "${role}" is missing "${key}"`, "config.creeps");
        hasIssues = true;
      }
    }

    if (!cfg.body && typeof cfg.getUpgraderBody !== "function") {
      Log.warn(`Creep config for role "${role}" is missing "body" or "getUpgraderBody()"`, "config.creeps");
      hasIssues = true;
    }

    if ("minLevel" in cfg) {
      Log.warn(`Creep config for role "${role}" uses "minLevel" - use "levelMin" instead`, "config.creeps");
      hasIssues = true;
    }
  }

  if (!hasIssues) {
    Log.info("Creep config validation passed", "config.creeps");
  }

  return !hasIssues;
}

module.exports = {
  getCreepConfig,
  getCreepsConfig,
  getCreepRoles,
  validateCreepConfigs,
};

