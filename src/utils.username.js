/**
 * Username utility functions
 * Provides functions to get and check usernames
 */

// Cache for own username (per tick)
let cachedUsername = null;
let cachedUsernameTick = null;

/**
 * Get the current player's username (cached per tick)
 * @returns {string|null} The username or null if not available
 */
function getMyUsername() {
  if (cachedUsername && cachedUsernameTick === Game.time) {
    return cachedUsername;
  }

  // Try to get from spawns first
  const spawns = Object.keys(Game.spawns);
  if (spawns.length > 0) {
    cachedUsername = Game.spawns[spawns[0]].owner.username;
    cachedUsernameTick = Game.time;
    return cachedUsername;
  }

  // Fallback: try structures
  const structures = Object.keys(Game.structures);
  if (structures.length > 0) {
    cachedUsername = Game.structures[structures[0]].owner.username;
    cachedUsernameTick = Game.time;
    return cachedUsername;
  }

  return null;
}

/**
 * Check if a username is hostile (not own and not Source Keeper)
 * @param {string} username - The username to check
 * @returns {boolean} True if hostile
 */
function isHostileUsername(username) {
  if (!username) return false;
  const myUsername = getMyUsername();
  return username !== myUsername && username !== "Source Keeper";
}

module.exports = {
  getMyUsername,
  isHostileUsername,
};

