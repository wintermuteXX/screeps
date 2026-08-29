/**
 * Constants - Centralized configuration values
 *
 * This file contains all magic numbers and hardcoded values used throughout the codebase.
 * Update values here to adjust behavior across the entire codebase.
 */

module.exports = {
  // CPU and Performance
  CPU: {
    BUCKET_CRITICAL: 100,           // Skip tick if bucket below this
    BUCKET_LOW: 1000,               // Low bucket threshold
    BUCKET_MEDIUM: 2000,            // Medium bucket threshold
    PIXEL_GENERATION_THRESHOLD: 9999,
  },

  // CPU Analysis Configuration
  CPU_ANALYSIS: {
    HISTORY_SIZE: 500,              // Number of ticks for rolling average
    CHECK_INTERVAL: 100,            // CPU-Analyse alle N Ticks
    CONQUER_THRESHOLD_AVG: 0.8,     // Max 80% CPU-Durchschnitt
  },

  // Tick Intervals
  TICKS: {
    LOG_INTERVAL: 100,              // Log every N ticks
    MEMHACK_CLEANUP_ROOMS: 100,     // Clean up room memory every N ticks
    LAB_CHECK_STATUS: 10,            // Check lab status every N ticks
    FIND_CLAIM_ROOM: 100,            // Find best room for claiming every N ticks
    ROOM_EXPIRE_TIME: 30000,         // Room memory expires after N ticks (~25 days)
    CHECK_POPULATION: 10,            // Check population every N ticks
    CHECK_LINKS: 5,                  // Check links every N ticks
    REPAIR_TOWER: 8,                 // Repair tower every N ticks
    INTERNAL_TRADE: 25,              // Internal trade every N ticks
    BUY_ENERGY_ORDER: 20,            // Buy energy order every N ticks
    SELL_MINERAL_OVERFLOW: 499,      // Sell mineral overflow every N ticks
    SELL_MINERAL: 200,               // Sell mineral every N ticks
    ADJUST_WALL_HITS: 1000,          // Adjust wall hits every N ticks
    ROOM_PLANNER: 50,                // Run room planner every N ticks
    SCOUT_VISUALIZATION_DURATION: 100, // World map visualization duration in ticks
    BUY_MISSING_MINERALS: 1000,        // Buy missing minerals every N ticks
  },

  // Resource Thresholds
  RESOURCES: {
    TOMBSTONE_MIN: 100,             // Minimum amount in tombstone to consider
    DROPPED_MIN: 100,               // Minimum dropped resource amount to collect
    DROPPED_MULTIPLIER: 50,         // Multiplier for dropped resources threshold (DROPPED_MIN * MULTIPLIER)
    CONTAINER_MIN: 750,              // Minimum amount in container to consider
    TERMINAL_MAX_STORE: 270000,     // Maximum terminal storage before stopping mining
    LAB_REACTION_MIN: 9000,         // Minimum resources needed for lab reaction
    CONTROLLER_ENERGY_BUFFER: 800,  // Energy buffer for controller container
    WALL_HITS_INCREMENT: 5000,      // Increment wall hits by this amount
    WALL_HITS_INITIAL: 5000,        // Initial wall hits target
    TERMINAL_ENERGY_BUFFER: 5000,   // Energy buffer for terminal operations
  },

  // Creep Limits
  CREEP_LIMITS: {
    BUILDER_MAX_LOW_LEVEL: 4,       // Max builders at low RCL
    TRANSPORTER_BASE: 4,             // Base transporter count at low RCL
    TRANSPORTER_MID: 2,              // Transporter count at mid RCL
    TRANSPORTER_HIGH: 1,             // Transporter count at high RCL
    UPGRADER_LOW: 3,                 // Upgrader count at RCL 1-4
    UPGRADER_MID: 2,                 // Upgrader count at RCL 5-6
    UPGRADER_HIGH: 1,                // Upgrader count at RCL 6-7
    UPGRADER_RCL8: 1,                // Upgrader count at RCL 8 (15 energy/tick limit)
    CONSTRUCTOR_LOW: 2,              // Constructor count at low RCL
    CONSTRUCTOR_HIGH: 1,             // Constructor count at high RCL
    ATTACKER_MAX: 1,                 // Max attacker creeps
    DEFENDER_MAX: 2,                 // Max defender creeps
    SUPPORTER_MAX: 3,                // Max supporter creeps
    CLAIMER_MAX: 1,                  // Max claimer creeps
    MINER_MINERAL_MAX: 1,            // Max mineral miners
  },

  // Creep Energy Limits
  CREEP_ENERGY: {
    RCL8_MAX_PER_TICK: 15,           // Maximum energy per tick at RCL 8
  },

  // Structure Energy Thresholds
  STRUCTURE_ENERGY: {
    TOWER_MIN: 500,                 // Minimum energy in tower before repair
    TOWER_ENERGY_THRESHOLD: 400,    // Minimum energy threshold for tower needs (below this = needs energy)
    LINK_SENDER_THRESHOLD: 100,      // Energy threshold for link sender
    LINK_RECEIVER_THRESHOLD: 200,    // Energy threshold for link receiver
    CONTROLLER_ENERGY_HIGH: 2000,   // High energy around controller
    POWER_SPAWN_ENERGY_THRESHOLD: 400, // Minimum energy threshold for power spawn needs
    POWER_SPAWN_POWER_THRESHOLD: 90,   // Minimum power threshold for power spawn needs (below this = needs power)
  },

  // Controller Downgrade Thresholds
  CONTROLLER: {
    TICKS_TO_DOWNGRADE_CRITICAL: 100,   // Critical - highest priority
    TICKS_TO_DOWNGRADE_LOW: 5000,       // Low - medium priority
    RANGE_FOR_DROPPED_RESOURCES: 3,     // Don't collect dropped resources near controller
  },

  /**
   * PRIORITY SYSTEM DOCUMENTATION
   * ==============================
   *
   * Schema: PRIORITY.NEED|GIVE.<RESOURCE>.<TARGET>
   * Resources: ENERGY, MINERAL, GHODIUM, POWER, ALL (any/mixed resource)
   *
   * PRIORITY RULES:
   * 1. Lower number = Higher priority (10 is more urgent than 100)
   * 2. NEED priorities: 10-145 (structures that need resources)
   * 3. GIVE priorities: 35-200 (sources that can give resources)
   * 4. MATCHING RULE: need.priority < give.priority
   *
   * NEED.ENERGY: CONTROLLER_CRITICAL(10), SPAWN(15), EXTENSION(20), CONTROLLER_LOW(25),
   *   TOWER_ENEMY(30), TERMINAL_LOW(45), STORAGE_MID(55), TOWER_NORMAL(60), CONSTRUCTOR(62),
   *   LAB(65), FACTORY(75), POWER_SPAWN(80), NUKER(110),
   *   TERMINAL_HIGH(115), STORAGE_OVERFLOW(125), CONTROLLER_NORMAL(127)
   * NEED.MINERAL: LAB_FILL(70), FACTORY(85), STORAGE(105), TERMINAL(135)
   * NEED.GHODIUM: NUKER(95)
   * NEED.POWER: POWER_SPAWN(90)
   *
   * GIVE.ENERGY: TERMINAL_LOW(35), STORAGE_LOW(40), STORAGE_OVERFLOW(120),
   *   TERMINAL_OVERFLOW(140), LINK(200)
   * GIVE.MINERAL: STORAGE_HIGH(100), TERMINAL(130), STORAGE_OVERFLOW(150)
   * GIVE.ALL: TOMBSTONE(165), RUIN(166), DROPPED(170), FACTORY_OVERFLOW(180),
   *   LAB_EMPTY(185), CONTAINER(195)
   *
   * DYNAMIC: Controller by ticksToDowngrade; Tower by enemies; Storage/Terminal by fill level
   */
  // Priority Values (lower = higher priority)
  PRIORITY: {
    NEED: {
      ENERGY: {
        CONTROLLER_CRITICAL: 10,
        SPAWN: 15,
        EXTENSION: 20,
        CONTROLLER_LOW: 25,
        TOWER_ENEMY: 30,
        TERMINAL_LOW: 45,
        STORAGE_MID: 55,
        TOWER_NORMAL: 60,
        CONSTRUCTOR: 62,
        LAB: 65,
        FACTORY: 75,
        POWER_SPAWN: 80,
        NUKER: 110,
        TERMINAL_HIGH: 115,             // Fill terminal toward MAX_ENERGY when storage is overfull
        STORAGE_OVERFLOW: 125,
        CONTROLLER_NORMAL: 127,
      },
      MINERAL: {
        LAB_FILL: 70,
        FACTORY: 85,
        STORAGE: 105,
        TERMINAL: 135,
      },
      GHODIUM: {
        NUKER: 95,
      },
      POWER: {
        POWER_SPAWN: 90,
      },
    },
    GIVE: {
      ENERGY: {
        TERMINAL_LOW: 35,
        STORAGE_LOW: 40,
        STORAGE_OVERFLOW: 120,
        TERMINAL_OVERFLOW: 140,
        LINK: 200,
      },
      MINERAL: {
        STORAGE_HIGH: 100,
        TERMINAL: 130,
        STORAGE_OVERFLOW: 150,
      },
      ALL: {
        TOMBSTONE: 165,
        RUIN: 166,
        DROPPED: 170,
        FACTORY_OVERFLOW: 180,
        LAB_EMPTY: 185,
        CONTAINER: 195,
      },
    },
  },

  // Creep Lifecycle
  CREEP_LIFECYCLE: {
    RENEW_EMERGENCY: 100,             // Renew if ticks to live below this
    RENEW_NORMAL: 500,                // Normal renew threshold
    RECYCLE_THRESHOLD: 200,           // Recycle if ticks to live below this
  },

  // Link Ranges
  LINK: {
    RANGE_TO_SOURCE: 3,               // Range from source to be considered sender
  },

  // Lab Configuration
  LAB: {
    RANGE: 2,                          // Maximum range between labs for reactions
  },

  // Container Placement
  CONTAINER: {
    RANGE_TO_CONTROLLER: 2,           // Range for controller container
    RANGE_DEFAULT: 1,                 // Default range for other containers
    MIN_RCL: 3,                       // Minimum RCL to build containers
  },

  // Room Analysis
  ROOM: {
    SOURCE_COUNT_CORE: 3,             // Source count for core room type
    BORDER_MIN: 1,                    // Minimum coordinate (avoid edge)
    BORDER_MAX: 48,                   // Maximum coordinate (avoid edge)
    CENTER_POSITION_X: 25,            // Default X coordinate for room center (used for travel targeting)
    CENTER_POSITION_Y: 25,            // Default Y coordinate for room center (used for travel targeting)
  },

  // Defense
  DEFENSE: {
    REPAIR_LIMIT: 0.95,               // Repair limit (95% of max hits)
  },

  // Storage
  STORAGE: {
    MAX_ENERGY_THRESHOLD: 100000,     // Maximum energy threshold for storage
  },

  // Terminal
  TERMINAL: {
    MAX_ENERGY: 100000,               // Soft cap: fill toward this only if storage energy is above STORAGE.MAX_ENERGY_THRESHOLD
  },

  // Market
  MARKET: {
    MIN_SELL_PRICE: 0.04,             // Minimum sell price
    MOD_SELL_AMOUNT_1: 50000,         // Modification sell amount threshold 1
    MOD_SELL_MULTIPLIER_1: 1.5,       // Modification sell multiplier 1
    MOD_SELL_AMOUNT_2: 90000,         // Modification sell amount threshold 2
    MOD_SELL_MULTIPLIER_2: 1.2,       // Modification sell multiplier 2
    MOD_SELL_AMOUNT_3: 150000,        // Modification sell amount threshold 3
    MOD_SELL_MULTIPLIER_3: 0.9,       // Modification sell multiplier 3
    MOD_SELL_MULTIPLIER_4: 0.75,      // Modification sell multiplier 4
    MIN_ORDER_AMOUNT: 50000,          // Minimum order amount
    MAX_ORDER_AMOUNT: 150000,         // Maximum order amount
    ENERGY_PRICE: 0.02,               // Energy price
    PROFIT_THRESHOLD: 0.05,           // Profit threshold
  },

  // Room Planner Configuration
  PLANNER: {
    // Construction Site Limits
    MAX_CONSTRUCTION_SITES: 5,

    // Road Building
    MIN_RCL_FOR_ROADS: 5,

    // Center Calculation
    CENTER_SEARCH_MIN: 6,
    CENTER_SEARCH_MAX: 44,
    CONTROLLER_WEIGHT: 0.5,

    // Alternative Position Search
    ALTERNATIVE_POSITION_RANGE: 2,

    // Special Structure Placement
    LINK_PLACEMENT_RANGE: 2,
    CONTAINER_CONTROLLER_RANGE: 2,
    CONTAINER_DEFAULT_RANGE: 1,

    // Visualization
    VISUALIZATION_DURATION: 15,

    // Room Boundaries
    ROOM_MIN: 2,
    ROOM_MAX: 47,
  },

  // Transport System Configuration
  TRANSPORT: {
    SCOUT_MAX_DISTANCE: 10,            // Maximum distance for scout visualization (room hops)
    SCOUT_OLD_THRESHOLD: 100000,       // Ticks since check to consider data "old"
    SCOUT_SCORE_THRESHOLD: 500,        // Minimum score to display on scout visualization
    SCOUT_MAX_SOURCE_DOTS: 4,          // Maximum number of source dots to display
  },
};

