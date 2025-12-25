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
    [ERR_NOT_OWNER]: "ERR_NOT_OWNER",
    [ERR_NO_PATH]: "ERR_NO_PATH",
    [ERR_NAME_EXISTS]: "ERR_NAME_EXISTS",
    [ERR_BUSY]: "ERR_BUSY",
    [ERR_NOT_FOUND]: "ERR_NOT_FOUND",
    [ERR_NOT_ENOUGH_RESOURCES]: "ERR_NOT_ENOUGH_RESOURCES",
    [ERR_INVALID_TARGET]: "ERR_INVALID_TARGET",
    [ERR_FULL]: "ERR_FULL",
    [ERR_NOT_IN_RANGE]: "ERR_NOT_IN_RANGE",
    [ERR_INVALID_ARGS]: "ERR_INVALID_ARGS",
    [ERR_TIRED]: "ERR_TIRED",
    [ERR_NO_BODYPART]: "ERR_NO_BODYPART",
    [ERR_RCL_NOT_ENOUGH]: "ERR_RCL_NOT_ENOUGH",
    [ERR_GCL_NOT_ENOUGH]: "ERR_GCL_NOT_ENOUGH",
  };

  // Return mapped error or unknown error code
  return errorMap[errorCode] || `Unknown error code: ${errorCode}`;
}

module.exports = {
  getErrorString,
};

