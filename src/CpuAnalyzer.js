const CONSTANTS = require("./constants");
const Log = require("Log");

/**
 * CPU Analyzer - Tracks global CPU usage over time and provides decision-making capabilities
 * for room conquering based on average CPU usage
 */
class CpuAnalyzer {
  constructor() {
    this.config = CONSTANTS.CPU_ANALYSIS || {
      HISTORY_SIZE: 1000,
      CONQUER_THRESHOLD_AVG: 0.8,
    };
  }

  /**
   * Records current CPU metrics for this tick
   */
  recordTick() {
    if (!Memory.cpuHistory) {
      Memory.cpuHistory = [];
    }

    const cpuUsed = Game.cpu.getUsed();
    const cpuLimit = Game.cpu.limit;
    
    // Count owned rooms
    const ownedRooms = Object.values(Game.rooms).filter(
      (room) => room.controller && room.controller.my
    );
    const roomCount = ownedRooms.length;
    const cpuPerRoom = roomCount > 0 ? cpuUsed / roomCount : cpuUsed;

    const entry = {
      tick: Game.time,
      cpu: {
        used: cpuUsed,
        limit: cpuLimit,
        bucket: Game.cpu.bucket,
      },
      rooms: {
        count: roomCount,
        perRoom: cpuPerRoom,
      },
    };

    Memory.cpuHistory.push(entry);

    // Cleanup old history to maintain rolling window
    this.cleanupOldHistory();
  }

  /**
   * Removes entries outside the history window
   */
  cleanupOldHistory() {
    if (!Memory.cpuHistory || Memory.cpuHistory.length === 0) {
      return;
    }

    const maxAge = this.config.HISTORY_SIZE;
    const currentTick = Game.time;

    // Remove entries older than HISTORY_SIZE ticks
    Memory.cpuHistory = Memory.cpuHistory.filter(
      (entry) => currentTick - entry.tick <= maxAge
    );
  }

  /**
   * Gets average value for a metric over a time window
   * @param {string} metricPath - Path to metric (e.g., 'cpu.used', 'rooms.perRoom')
   * @param {number} window - Number of ticks to average over (default: all available)
   * @returns {number} Average value
   */
  getAverage(metricPath, window) {
    if (!Memory.cpuHistory || Memory.cpuHistory.length === 0) {
      return 0;
    }

    const history = Memory.cpuHistory;
    const windowSize = window || history.length;
    const recentHistory = history.slice(-windowSize);

    let sum = 0;
    let count = 0;

    for (const entry of recentHistory) {
      const value = this._getNestedValue(entry, metricPath);
      if (value !== null && value !== undefined) {
        sum += value;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  /**
   * Calculates trend for a metric (rising, falling, stable)
   * @param {string} metricPath - Path to metric
   * @param {number} window - Number of ticks to analyze (default: 100)
   * @returns {string} 'rising', 'falling', or 'stable'
   */
  getTrend(metricPath, window) {
    if (!Memory.cpuHistory || Memory.cpuHistory.length < 2) {
      return "stable";
    }

    const history = Memory.cpuHistory;
    const windowSize = window || 100;
    const recentHistory = history.slice(-windowSize);

    if (recentHistory.length < 2) {
      return "stable";
    }

    // Split into two halves
    const midPoint = Math.floor(recentHistory.length / 2);
    const firstHalf = recentHistory.slice(0, midPoint);
    const secondHalf = recentHistory.slice(midPoint);

    const firstAvg =
      firstHalf.reduce((sum, entry) => {
        const value = this._getNestedValue(entry, metricPath);
        return sum + (value || 0);
      }, 0) / firstHalf.length;

    const secondAvg =
      secondHalf.reduce((sum, entry) => {
        const value = this._getNestedValue(entry, metricPath);
        return sum + (value || 0);
      }, 0) / secondHalf.length;

    const threshold = 0.05; // 5% change threshold
    const change = (secondAvg - firstAvg) / (firstAvg || 1);

    if (change > threshold) {
      return "rising";
    } else if (change < -threshold) {
      return "falling";
    } else {
      return "stable";
    }
  }

  /**
   * Gets comprehensive statistics
   * @param {number} window - Time window for statistics (default: all available)
   * @returns {Object} Statistics object
   */
  getStatistics(window) {
    if (!Memory.cpuHistory || Memory.cpuHistory.length === 0) {
      return {
        samples: 0,
        average: {},
      };
    }

    const windowSize = window || Memory.cpuHistory.length;

    return {
      samples: Memory.cpuHistory.length,
      window: windowSize,
      average: {
        cpuUsed: this.getAverage("cpu.used", windowSize),
        cpuLimit: this.getAverage("cpu.limit", windowSize),
        cpuPerRoom: this.getAverage("rooms.perRoom", windowSize),
      },
    };
  }

  /**
   * Determines if a new room can be conquered based on average CPU usage over last 1000 ticks
   * @param {Object} options - Optional configuration overrides
   * @returns {Object} Decision object with canConquer, reason, and metrics
   */
  canConquerNewRoom(options) {
    const config = {
      ...this.config,
      ...(options || {}),
    };

    // Use last 1000 ticks for analysis
    const analysisWindow = 1000;

    if (!Memory.cpuHistory || Memory.cpuHistory.length < 10) {
      return {
        canConquer: false,
        reason: "Insufficient CPU history data (need at least 10 samples)",
        metrics: {},
      };
    }

    // Get statistics for the last 1000 ticks
    const stats = this.getStatistics(analysisWindow);
    const avg = stats.average;

    // Check: Average CPU usage over last 1000 ticks must be below threshold
    const avgCpuPercent = avg.cpuLimit > 0 ? avg.cpuUsed / avg.cpuLimit : 0;
    if (avgCpuPercent >= config.CONQUER_THRESHOLD_AVG) {
      return {
        canConquer: false,
        reason: `Average CPU usage too high (last ${Math.min(analysisWindow, stats.samples)} ticks): ${(avgCpuPercent * 100).toFixed(1)}% >= ${(config.CONQUER_THRESHOLD_AVG * 100).toFixed(1)}%`,
        metrics: {
          avgCpuPercent: avgCpuPercent,
          threshold: config.CONQUER_THRESHOLD_AVG,
          samples: stats.samples,
        },
      };
    }

    // All checks passed
    return {
      canConquer: true,
      reason: `Average CPU usage acceptable (last ${Math.min(analysisWindow, stats.samples)} ticks): ${(avgCpuPercent * 100).toFixed(1)}%`,
      metrics: {
        avgCpuPercent: avgCpuPercent,
        avgCpuUsed: avg.cpuUsed,
        avgCpuLimit: avg.cpuLimit,
        avgCpuPerRoom: avg.cpuPerRoom,
        samples: stats.samples,
      },
    };
  }

  /**
   * Gets the previous bucket value from cpuHistory
   * @returns {number} Previous bucket value, or current bucket if no history available
   */
  getPreviousBucket() {
    if (!Memory.cpuHistory || Memory.cpuHistory.length === 0) {
      return Game.cpu.bucket;
    }
    
    // Get the most recent entry (last tick)
    const lastEntry = Memory.cpuHistory[Memory.cpuHistory.length - 1];
    return (lastEntry.cpu && lastEntry.cpu.bucket) || Game.cpu.bucket;
  }

  /**
   * Helper function to get nested value from object using dot notation
   * @private
   */
  _getNestedValue(obj, path) {
    const parts = path.split(".");
    let value = obj;
    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[part];
    }
    return value;
  }

}

// Export singleton instance
module.exports = new CpuAnalyzer();

