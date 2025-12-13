const Behavior = require("./behavior.base");
const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

/**
 * Checks if creep is not at room border
 */
function isNotAtBorder(creep) {
  const { BORDER_MIN, BORDER_MAX } = CONSTANTS.ROOM;
  return creep.pos.x > BORDER_MIN && creep.pos.x < BORDER_MAX &&
         creep.pos.y > BORDER_MIN && creep.pos.y < BORDER_MAX;
}

/**
 * Configuration for different flag colors
 */
const FLAG_CONFIGS = {
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
      return flag.room === creep.room && isNotAtBorder(creep);
    },
  },
  white: {
    color: COLOR_WHITE,
    travelOptions: { preferHighway: true },
    whenCondition: function (creep, flag) {
      return flag.room !== creep.room;
    },
    completedCondition: function (creep, flag) {
      return flag.room === creep.room && isNotAtBorder(creep);
    },
  },
  green: {
    color: COLOR_GREEN,
    travelOptions: { preferHighway: true },
    whenCondition: function (creep, flag) {
      return flag.room !== creep.room && creep.store.getUsedCapacity() === 0;
    },
    completedCondition: function (creep, flag) {
      return flag.room === creep.room && isNotAtBorder(creep);
    },
  },
};

// Cache for created behaviors
const behaviorCache = {};

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
  let colorName = "red"; // default
  if (behaviorName.indexOf(":") !== -1) {
    colorName = behaviorName.split(":")[1];
  }

  let config = FLAG_CONFIGS[colorName];
  if (!config) {
    Log.warn(`Unknown flag color '${  colorName  }', using default 'red'`, "goto_flag");
    config = FLAG_CONFIGS.red;
    colorName = "red";
  }

  const b = new Behavior(behaviorName);

  function findFlag() {
    return _.find(Game.flags, {
      color: config.color,
    });
  }

  b.when = function (creep, rc) {
    const flag = findFlag();
    if (!flag) return false;
    return config.whenCondition(creep, flag);
  };

  b.completed = function (creep, rc) {
    const flag = findFlag();
    if (!flag) return true;
    return config.completedCondition(creep, flag);
  };

  b.work = function (creep, rc) {
    const flag = findFlag();
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

