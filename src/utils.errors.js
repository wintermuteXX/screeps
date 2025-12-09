/**
 * Converts Screeps error codes to human-readable strings
 * @param {number} errorCode - The error code from Screeps API
 * @returns {string} Human-readable error message
 */
function getErrorString(errorCode) {
  // Handle OK case
  if (errorCode === OK || errorCode === 0) {
    return "OK";
  }

  // Map error codes to strings
  const errorMap = {
    [ERR_NOT_OWNER]: "ERR_NOT_OWNER - You are not the owner of this object",
    [ERR_NO_PATH]: "ERR_NO_PATH - No path to the target could be found",
    [ERR_NAME_EXISTS]: "ERR_NAME_EXISTS - Name already exists",
    [ERR_BUSY]: "ERR_BUSY - The spawn is already in process of spawning another creep",
    [ERR_NOT_FOUND]: "ERR_NOT_FOUND - The target was not found",
    [ERR_NOT_ENOUGH_RESOURCES]: "ERR_NOT_ENOUGH_RESOURCES - Not enough resources",
    [ERR_INVALID_TARGET]: "ERR_INVALID_TARGET - Target is invalid",
    [ERR_FULL]: "ERR_FULL - The target is full",
    [ERR_NOT_IN_RANGE]: "ERR_NOT_IN_RANGE - Target is out of range",
    [ERR_INVALID_ARGS]: "ERR_INVALID_ARGS - Invalid arguments provided",
    [ERR_TIRED]: "ERR_TIRED - The creep is still tired",
    [ERR_NO_BODYPART]: "ERR_NO_BODYPART - The creep does not have the required body part",
    [ERR_RCL_NOT_ENOUGH]: "ERR_RCL_NOT_ENOUGH - Room Controller Level insufficient",
    [ERR_GCL_NOT_ENOUGH]: "ERR_GCL_NOT_ENOUGH - Global Control Level insufficient",
  };

  // Return mapped error or unknown error code
  return errorMap[errorCode] || `Unknown error code: ${errorCode}`;
}

module.exports = {
  getErrorString,
};

