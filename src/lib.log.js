/**
 * Log.js
 *
 * ES6 log class for logging screeps messages with color, where it makes sense.
 *
 * LOGGING GUIDELINES:
 * ===================
 * Use the appropriate log level based on the message type:
 *
 * - Log.debug(): Development/debugging information (e.g., detailed state, intermediate values)
 *   Example: "Creep trying to withdraw 50 energy from storage"
 *
 * - Log.info(): Important operational events (e.g., successful actions, state changes)
 *   Example: "Creep successfully collected energy from source"
 *
 * - Log.success(): Successful completion of important operations
 *   Example: "Room upgraded to RCL 5"
 *
 * - Log.warn(): Potential problems or unexpected situations (e.g., missing targets, low resources)
 *   Example: "No transport orders available for creep"
 *   Always include context: what happened, why it might be a problem, what the system will do
 *
 * - Log.error(): Critical errors that affect functionality (e.g., missing required objects, API errors)
 *   Example: "Failed to spawn creep: ERR_NOT_ENOUGH_ENERGY"
 *   Always include error codes using global.getErrorString() when available
 *
 * - Log.test(): Test messages for development/debugging (always displayed, bypasses level checks)
 *   Example: "Testing creep behavior in room E1N1"
 *   NOTE: This log level should NOT be used in final production code
 *
 * BEST PRACTICES:
 * - Always use tags to categorize logs (e.g., "transport", "spawn", "defense")
 * - Include relevant context (creep names, room names, resource amounts)
 * - Use consistent formatting for similar messages
 * - Don't log in tight loops (use conditional logging or rate limiting)
 * - Use Log.warn() for recoverable issues, Log.error() for critical failures
 */
"use strict";

class Log {
  constructor() {
    throw new Error("Log is a static class");
  }

  static debug(msg, tag) {
    this.log(Log.LEVEL_DEBUG, msg, tag);
  }

  /** */
  static info(msg, tag) {
    this.log(Log.LEVEL_INFO, msg, tag);
  }

  /** */
  static warn(msg, tag) {
    this.log(Log.LEVEL_WARN, msg, tag);
  }

  /** */
  static error(msg, tag) {
    this.log(Log.LEVEL_ERROR, msg, tag);
  }

  /** */
  static success(msg, tag) {
    this.log(Log.LEVEL_SUCCESS, msg, tag);
  }

  /**
   * Test log level - always displayed, bypasses level checks
   * Should NOT be used in final production code
   */
  static test(msg, tag) {
    // Always display test logs, bypass level check
    this.toConsole(msg, Log.color[Log.LEVEL_TEST], tag);
  }

  /** */
  static log(level = Log.LEVEL_DEBUG, msg, tag) {
    const color = Log.color[level];
    if (tag && this.getLogLevel(tag) > level) return;
    this.toConsole(msg, color, tag);
  }

  /**
   * HTML table in console
   * ex: Log.table(['a','b'], [[1,2],[3,4]])
   */
  static table(headers, rows) {
    let msg = "<table>";
    _.each(headers, (h) => (msg += `<th width="50px">${  h  }</th>`));
    _.each(rows, (row) => (msg += `<tr>${  _.map(row, (el) => `<th>${el}</th>`)  }</tr>`));
    msg += "</table>";
    // console.log(msg);
    return msg;
  }

  /** */
  static notify(msg, group = 0, color = "red") {
    this.toConsole(msg, color);
    Game.notify(msg, group);
  }

  /** */
  static getLogLevel(tag) {
    if (!Memory.logging) Memory.logging = {};
    if (Memory.logging[tag] == null) return Log.LEVEL_WARN;
    return Memory.logging[tag];
  }

  /** */
  static toConsole(msg, color, tag) {
    if (tag) console.log(`<font color=${color}>[${Game.time}][${tag}] ${msg}</font>`);
    else console.log(`<font color=${color}>[${Game.time}] ${msg}</font>`);
  }

  /** */
  static progress(v, m) {
    return `<progress value="${v}" max="${m}"/>`;
  }
}

/** Log levels */
Log.LEVEL_TEST = -1; // Always displayed, bypasses level checks
Log.LEVEL_DEBUG = 0;
Log.LEVEL_INFO = 1;
Log.LEVEL_WARN = 2;
Log.LEVEL_ERROR = 3;
Log.LEVEL_SUCCESS = 4;

/** Log colors */
Log.color = {
  [Log.LEVEL_TEST]: "magenta",
  [Log.LEVEL_DEBUG]: "yellow",
  [Log.LEVEL_INFO]: "cyan",
  [Log.LEVEL_WARN]: "orange",
  [Log.LEVEL_ERROR]: "red",
  [Log.LEVEL_SUCCESS]: "green",
};

Object.freeze(Log);
Object.freeze(Log.color);

module.exports = Log;
