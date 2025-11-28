var Behavior = require("_behavior");

/**
 * Configuration for different flag colors
 */
var FLAG_CONFIGS = {
  red: {
    color: COLOR_RED,
    travelOptions: { ignoreDestructibleStructures: true },
    whenCondition: function (creep, flag) {
      return flag.room !== creep.room;
    },
    completedCondition: function (creep, flag) {
      return flag.pos === creep.pos;
    },
  },
  yellow: {
    color: COLOR_YELLOW,
    travelOptions: { preferHighway: true },
    whenCondition: function (creep, flag) {
      return flag.room !== creep.room && creep.store.getUsedCapacity() === 0;
    },
    completedCondition: function (creep, flag) {
      return flag.room === creep.room && 
             creep.pos.x > 0 && creep.pos.x < 49 && 
             creep.pos.y > 0 && creep.pos.y < 49;
    },
  },
  white: {
    color: COLOR_WHITE,
    travelOptions: { preferHighway: true },
    whenCondition: function (creep, flag) {
      return flag.room !== creep.room;
    },
    completedCondition: function (creep, flag) {
      return flag.room === creep.room && 
             creep.pos.x > 0 && creep.pos.x < 49 && 
             creep.pos.y > 0 && creep.pos.y < 49;
    },
  },
  green: {
    color: COLOR_GREEN,
    travelOptions: { preferHighway: true },
    whenCondition: function (creep, flag) {
      return flag.room !== creep.room && creep.store.getUsedCapacity() === 0;
    },
    completedCondition: function (creep, flag) {
      return flag.room === creep.room && 
             creep.pos.x > 0 && creep.pos.x < 49 && 
             creep.pos.y > 0 && creep.pos.y < 49;
    },
  },
};

// Cache for created behaviors
var behaviorCache = {};

/**
 * Creates a goto_flag behavior instance
 * Supports parameter format: "goto_flag:red", "goto_flag:yellow", etc.
 */
function createGotoFlagBehavior(behaviorName) {
  // Check cache first
  if (behaviorCache[behaviorName]) {
    return behaviorCache[behaviorName];
  }
  
  // Parse color from behavior name (format: "goto_flag:red" or "goto_flag")
  var colorName = "red"; // default
  if (behaviorName.indexOf(":") !== -1) {
    colorName = behaviorName.split(":")[1];
  }
  
  var config = FLAG_CONFIGS[colorName];
  if (!config) {
    console.log("Warning: Unknown flag color '" + colorName + "', using default 'red'");
    config = FLAG_CONFIGS.red;
    colorName = "red";
  }

  var b = new Behavior(behaviorName);

  function findFlag() {
    return _.find(Game.flags, {
      color: config.color,
    });
  }

  b.when = function (creep, rc) {
    var flag = findFlag();
    if (!flag) return false;
    return config.whenCondition(creep, flag);
  };

  b.completed = function (creep, rc) {
    var flag = findFlag();
    if (!flag) return true;
    return config.completedCondition(creep, flag);
  };

  b.work = function (creep, rc) {
    var flag = findFlag();
    if (flag) {
      creep.travelTo(flag, config.travelOptions);
    }
  };

  // Cache the behavior
  behaviorCache[behaviorName] = b;
  return b;
}

// Export factory function
module.exports = createGotoFlagBehavior;

