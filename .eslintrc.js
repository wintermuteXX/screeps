module.exports = {
  root: true,
  env: {
    node: true,
    es2017: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: "module",
    project: "./jsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "prettier", // Must be last to override other configs
  ],
  rules: {
    // ECMAScript 2017 Standards
    "no-var": "error",
    "prefer-const": "error",
    "prefer-arrow-callback": "warn",
    "prefer-template": "warn",
    "prefer-destructuring": ["warn", {
      "array": false,
      "object": true
    }],
    
    // Code Organization
    "camelcase": ["warn", {
      "properties": "always",
      "ignoreDestructuring": false
    }],
    "no-underscore-dangle": ["warn", {
      "allow": ["_rooms", "_cache", "_creepsByRole", "_init", "_behavior", "_updateMemory", "_getResourceFromMemory", "_shouldCreateCreep", "_harvestPowerCache", "_harvestPowerCacheTick", "_collectResource", "_withdrawResource", "_pickupResource", "_handleCollectionResult", "_updateMemoryWithActualAmount", "_getCarriedResources", "_updateMemoryWithCarriedResources", "_getDeliveryOrders", "_groupOrdersByTarget", "_isTargetValid", "_findBestTargetFromOrders", "_findMatchingNeed", "_findTerminalFallback", "_dropAllResources", "_updateMemoryAfterTransfer", "_calculateTransferAmount", "_handleTransferResult", "_validateCurrentTarget", "_createOrdersFromMemory", "_performBatchDelivery", "_calculateOptimalCenter", "_structureCounts"]
    }],
    
    // Performance - Prevent require() in loops (but allow at module level)
    // Note: This is a best practice, but we can't easily detect require() in loops with static analysis
    // The rule is disabled here, but should be enforced via code review
    
    // Error Handling
    "no-undef": "error",
    "no-unused-vars": ["warn", {
      "argsIgnorePattern": "^(_|rc|creep)$",
      "varsIgnorePattern": "^(_|memoryEntry)$"
    }],
    
    // Best Practices
    "eqeqeq": ["error", "always"],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-return-assign": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-throw-literal": "error",
    "no-unmodified-loop-condition": "warn",
    "no-unused-expressions": "warn",
    "no-useless-call": "warn",
    "no-useless-concat": "warn",
    "no-useless-return": "warn",
    "prefer-promise-reject-errors": "error",
    "radix": "error",
    "require-await": "warn",
    "vars-on-top": "off", // Allow const/let anywhere
    
    // Style (Prettier handles formatting, but we keep some rules for consistency)
    "eol-last": ["warn", "always"],
    
    // TypeScript-specific
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^(_|rc|creep)$",
      "varsIgnorePattern": "^(_|memoryEntry)$"
    }],
  },
  overrides: [
    {
      // Screeps global objects
      files: ["src/**/*.js"],
      globals: {
        "Game": "readonly",
        "Memory": "readonly",
        "RawMemory": "readonly",
        "Creep": "readonly",
        "Room": "readonly",
        "Structure": "readonly",
        "Spawn": "readonly",
        "Source": "readonly",
        "Mineral": "readonly",
        "Resource": "readonly",
        "Flag": "readonly",
        "ConstructionSite": "readonly",
        "PathFinder": "readonly",
        "MOVE": "readonly",
        "WORK": "readonly",
        "CARRY": "readonly",
        "ATTACK": "readonly",
        "RANGED_ATTACK": "readonly",
        "HEAL": "readonly",
        "CLAIM": "readonly",
        "TOUGH": "readonly",
        "FIND_SOURCES": "readonly",
        "FIND_STRUCTURES": "readonly",
        "FIND_CONSTRUCTION_SITES": "readonly",
        "FIND_DROPPED_RESOURCES": "readonly",
        "FIND_MY_STRUCTURES": "readonly",
        "FIND_MY_SPAWNS": "readonly",
        "FIND_HOSTILE_CREEPS": "readonly",
        "FIND_HOSTILE_SPAWNS": "readonly",
        "FIND_HOSTILE_STRUCTURES": "readonly",
        "FIND_DEPOSITS": "readonly",
        "FIND_MY_CREEPS": "readonly",
        "FIND_MINERALS": "readonly",
        "STRUCTURE_TOWER": "readonly",
        "STRUCTURE_SPAWN": "readonly",
        "STRUCTURE_EXTENSION": "readonly",
        "STRUCTURE_CONTAINER": "readonly",
        "STRUCTURE_LINK": "readonly",
        "STRUCTURE_TERMINAL": "readonly",
        "STRUCTURE_FACTORY": "readonly",
        "STRUCTURE_LAB": "readonly",
        "STRUCTURE_EXTRACTOR": "readonly",
        "STRUCTURE_OBSERVER": "readonly",
        "STRUCTURE_CONTROLLER": "readonly",
        "RESOURCE_ENERGY": "readonly",
        "COLOR_RED": "readonly",
        "COLOR_GREEN": "readonly",
        "COLOR_WHITE": "readonly",
        "COLOR_YELLOW": "readonly",
        "OK": "readonly",
        "ERR_NOT_IN_RANGE": "readonly",
        "ERR_NO_BODYPART": "readonly",
        "ERR_NOT_ENOUGH_RESOURCES": "readonly",
        "ERR_INVALID_TARGET": "readonly",
        "ERR_FULL": "readonly",
        "ERR_NOT_OWNER": "readonly",
        "ERR_BUSY": "readonly",
        "ERR_NOT_FOUND": "readonly",
        "ERR_INVALID_ARGS": "readonly",
        "ERR_TIRED": "readonly",
        "ERR_NO_BODYPART": "readonly",
        "ERR_RCL_NOT_ENOUGH": "readonly",
        "ERR_NO_PATH": "readonly",
        "EXTRACTOR_COOLDOWN": "readonly",
        "RoomPosition": "readonly",
        "HARVEST_POWER": "readonly",
        "BOOSTS": "readonly",
        "PWR_OPERATE_FACTORY": "readonly",
        "COMMODITIES": "readonly",
        "MarketCal": "readonly",
        "REACTION_TIME": "readonly",
        "REACTIONS": "readonly",
        "_": "readonly",
      },
    },
  ],
};

