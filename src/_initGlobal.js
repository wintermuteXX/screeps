const Log = require("Log");
const utilsUsername = require("utils.username");
const utilsRoomAnalysis = require("utils.roomAnalysis");
const utilsResources = require("utils.resources");
const utilsConsole = require("utils.console");
const utilsRoomPlanner = require("utils.roomPlanner");
const createBehaviorRegistry = require("utils.behaviors");
const createCreepConfigUtils = require("utils.creeps");
require("utils.roomPrototypes"); // Extends prototypes, no exports

function initGlobal(g) {
  // ===== Username Utilities =====
  g.getMyUsername = utilsUsername.getMyUsername;
  g.isHostileUsername = utilsUsername.isHostileUsername;

  // ===== Room Analysis =====
  g.analyzeRoom = utilsRoomAnalysis.analyzeRoom;

  // ===== Resource Helpers =====
  global.fillLevel = utilsResources.fillLevelConfig;
  global.resourceImg = utilsResources.resourceImg;
  global.globalResourcesAmount = utilsResources.globalResourcesAmount;
  global.reorderResources = utilsResources.reorderResources;

  // ===== Behavior Registry =====
  const behaviorRegistry = createBehaviorRegistry();
  g._behaviors = {};
  g.getBehavior = function(key) {
    const behavior = behaviorRegistry.getBehavior(key);
    if (behavior) {
      // Cache in global for backward compatibility
      if (!g._behaviors[key]) {
        g._behaviors[key] = behavior;
      }
      return behavior;
    }
    return null;
  };
  g._registerBehavior = behaviorRegistry._registerBehavior;

  // ===== Creep Config =====
  const creepConfigUtils = createCreepConfigUtils();
  g._creeps = creepConfigUtils.getCreepsConfig();
  g.getCreepConfig = creepConfigUtils.getCreepConfig;
  g.getCreepsConfig = creepConfigUtils.getCreepsConfig;
  g.getCreepRoles = creepConfigUtils.getCreepRoles;

  // ===== Console Helpers =====
  g.whatsInTerminals = utilsConsole.whatsInTerminals;
  g.numberOfTerminals = utilsConsole.numberOfTerminals;
  global.showLabs = utilsConsole.showLabs;
  global.myResources = utilsConsole.myResources;
  global.marketInfo = utilsConsole.marketInfo;
  global.json = utilsConsole.json;
  global.help = utilsConsole.help;
  global.voiceConsole = utilsConsole.voiceConsole;
  global.visualizeLogistic = utilsConsole.visualizeLogistic;

  // ===== RoomPlanner Helpers =====
  global.plannerVisualize = utilsRoomPlanner.plannerVisualize;
  global.plannerStats = utilsRoomPlanner.plannerStats;
  global.plannerReset = utilsRoomPlanner.plannerReset;
  global.plannerRun = utilsRoomPlanner.plannerRun;
  global.plannerSetCenter = utilsRoomPlanner.plannerSetCenter;

  // ===== Utility Functions =====
  /**
   * Kill all creeps (debug utility)
   */
  g.killAll = function () {
    for (const c in Game.creeps) {
      Game.creeps[c].suicide();
    }
  };
}

module.exports = initGlobal;
