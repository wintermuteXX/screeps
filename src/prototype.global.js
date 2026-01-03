const utilsUsername = require("./utils.username");
const utilsRoomAnalysis = require("./utils.roomAnalysis");
const utilsResources = require("./utils.resources");
const utilsConsole = require("./utils.console");
const utilsRoomPlanner = require("./utils.roomPlanner");
const createBehaviorRegistry = require("./utils.behaviors");
const utilsErrors = require("./utils.errors");
require("./utils.roomPrototypes"); // Extends prototypes, no exports

function initGlobal() {
  // ===== Username Utilities =====
  global.getMyUsername = utilsUsername.getMyUsername;
  global.isHostileUsername = utilsUsername.isHostileUsername;

  // ===== Room Analysis =====
  global.analyzeRoom = utilsRoomAnalysis.analyzeRoom;

  // ===== Resource Helpers =====
  global.fillLevel = utilsResources.fillLevelConfig;
  global.resourceImg = utilsResources.resourceImg;
  global.globalResourcesAmount = utilsResources.globalResourcesAmount;
  global.reorderResources = utilsResources.reorderResources;

  // ===== Behavior Registry =====
  const behaviorRegistry = createBehaviorRegistry();
  global._behaviors = {};
  global.getBehavior = function(key) {
    const behavior = behaviorRegistry.getBehavior(key);
    if (behavior) {
      // Cache in global for backward compatibility
      if (!global._behaviors[key]) {
        global._behaviors[key] = behavior;
      }
      return behavior;
    }
    return null;
  };
  global._registerBehavior = behaviorRegistry._registerBehavior;

  // ===== Console Helpers =====
  global.showTerminals = utilsConsole.showTerminals;
  global.numberOfTerminals = utilsConsole.numberOfTerminals;
  global.showLabs = utilsConsole.showLabs;
  global.showResources = utilsConsole.showResources;
  global.showMarket = utilsConsole.showMarket;
  global.json = utilsConsole.json;
  global.help = utilsConsole.help;
  global.showLogistic = utilsConsole.showLogistic;
  global.showCPU = utilsConsole.showCPU;
  global.showScout = utilsConsole.showScout;
  global.showRclUpgradeTimes = utilsConsole.showRclUpgradeTimes;
  global.cleanMemory = utilsConsole.cleanMemory;
  global.profileMemory = utilsConsole.profileMemory;

  // ===== RoomPlanner Helpers =====
  global.plannerVisualize = utilsRoomPlanner.plannerVisualize;
  global.plannerStats = utilsRoomPlanner.plannerStats;
  global.plannerReset = utilsRoomPlanner.plannerReset;
  global.plannerRun = utilsRoomPlanner.plannerRun;
  global.plannerSetCenter = utilsRoomPlanner.plannerSetCenter;
  global.plannerOrphaned = utilsRoomPlanner.plannerOrphaned;
  global.plannerRecalculateExtensions = utilsRoomPlanner.plannerRecalculateExtensions;
  global.plannerRecalculateExtensionsAll = utilsRoomPlanner.plannerRecalculateExtensionsAll;

  // ===== Error Utilities =====
  global.getErrorString = utilsErrors.getErrorString;

  // ===== Utility Functions =====
  /**
   * Kill all creeps (debug utility)
   */
  global.killAll = function () {
    for (const c in Game.creeps) {
      Game.creeps[c].suicide();
    }
  };
}

module.exports = initGlobal;
