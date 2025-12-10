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
    BUCKET_HIGH: 9999,              // Generate pixel if above this
    PIXEL_GENERATION_THRESHOLD: 9999,
    NO_ANALYSE_LIMIT: 100,            // Don't analyze if CPU tick limit below this
  },

  // CPU Analysis Configuration
  CPU_ANALYSIS: {
    HISTORY_SIZE: 500,              // Anzahl Ticks für rollierenden Durchschnitt
    CHECK_INTERVAL: 100,            // CPU-Analyse alle N Ticks
    CONQUER_THRESHOLD_AVG: 0.8,     // Max 80% CPU-Durchschnitt
    CONQUER_THRESHOLD_BUCKET: 2000, // Min Bucket-Level
    CONQUER_THRESHOLD_PEAK: 0.95,   // Max 95% CPU-Spitze
  },

// Tick Intervals
  TICKS: {
    LOG_INTERVAL: 100,              // Log every N ticks
    MEMHACK_CLEANUP_ROOMS: 100,     // Clean up room memory every N ticks
    MEMHACK_CLEANUP_STRUCTURES: 10000, // Clean up structure memory every N ticks
    LAB_CHECK_STATUS: 10,            // Check lab status every N ticks
    ROOM_EXPIRE_TIME: 30000,         // Room memory expires after N ticks (~25 days)
    CHECK_POPULATION: 10,            // Check population every N ticks
    CHECK_CONSTRUCTIONS: 100,        // Check constructions every N ticks
    CHECK_LINKS: 5,                  // Check links every N ticks
    CHECK_RESOURCES_QUEUE: 1,        // Check resources queue every N ticks
    REPAIR_TOWER: 8,                 // Repair tower every N ticks
    INTERNAL_TRADE: 25,              // Internal trade every N ticks
    BUY_ENERGY_ORDER: 20,            // Buy energy order every N ticks
    SELL_MINERAL_OVERFLOW: 499,      // Sell mineral overflow every N ticks
    SELL_MINERAL: 200,               // Sell mineral every N ticks
    ADJUST_WALL_HITS: 1000,          // Adjust wall hits every N ticks
    ROOM_PLANNER: 50,                // Run room planner every N ticks
    FACTORY_POWER_CHECK: 100,        // Check factory power level every N ticks
  },

  // Resource Thresholds
  RESOURCES: {
    TOMBSTONE_MIN: 100,             // Minimum amount in tombstone to consider
    DROPPED_MIN: 100,               // Minimum dropped resource amount to collect
    CONTAINER_MIN: 750,              // Minimum amount in container to consider
    TERMINAL_MIN_SELL: 10000,       // Minimum mineral amount before selling
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
    SUPPORTER_MAX: 3,                // Max supporter creeps
    CLAIMER_MAX: 1,                  // Max claimer creeps
    MINER_PER_SOURCE: 1,             // Miners per source
    MINER_MINERAL_MAX: 1,            // Max mineral miners
    MINER_COMMODITY_MAX: 1,          // Max commodity miners
  },

  // Structure Energy Thresholds
  STRUCTURE_ENERGY: {
    TOWER_MIN: 500,                 // Minimum energy in tower before repair
    LINK_SENDER_THRESHOLD: 100,      // Energy threshold for link sender
    LINK_RECEIVER_THRESHOLD: 200,    // Energy threshold for link receiver
    CONTROLLER_ENERGY_HIGH: 2000,   // High energy around controller
  },

  // Controller Downgrade Thresholds
  CONTROLLER: {
    TICKS_TO_DOWNGRADE_CRITICAL: 100,   // Critical - highest priority
    TICKS_TO_DOWNGRADE_LOW: 5000,       // Low - medium priority
    RANGE_FOR_DROPPED_RESOURCES: 3,     // Don't collect dropped resources near controller
  },

  // Priority Values (lower = higher priority)
  PRIORITY: {
    // ===== NEEDS (needsResources) - Structures that need resources =====
    CONTROLLER_CRITICAL: 10,         // [NEEDS] Controller about to downgrade
    CONTROLLER_LOW: 25,               // [NEEDS] Controller low on time
    SPAWN: 15,                        // [NEEDS] Spawns
    EXTENSION: 20,                    // [NEEDS] Extensions
    TOWER_ENEMY: 30,                  // [NEEDS] Towers when enemies present
    TERMINAL_ENERGY_LOW: 35,          // [NEEDS/GIVES] Terminal energy very low (used in both)
    STORAGE_ENERGY_MID: 55,           // [NEEDS] Storage energy medium
    TOWER_NORMAL: 60,                 // [NEEDS] Towers when no enemies
    CONSTRUCTOR: 62,                  // [NEEDS] Constructors              
    LAB: 65,                          // [NEEDS] Labs
    LAB_FILL: 70,                     // [NEEDS] Labs filling
    FACTORY_ENERGY: 75,               // [NEEDS] Factory energy
    POWER_SPAWN_ENERGY: 80,           // [NEEDS] Power spawn energy
    FACTORY_MINERAL: 85,              // [NEEDS] Factory minerals
    POWER_SPAWN_POWER: 90,            // [NEEDS] Power spawn power
    NUKER_GHODIUM: 95,                // [NEEDS] Nuker ghodium
    STORAGE_MINERAL: 105,             // [NEEDS] Storage minerals
    NUKER_ENERGY: 110,                // [NEEDS] Nuker energy
    STORAGE_ENERGY_OVERFLOW: 120,     // [NEEDS/GIVES] Storage energy overflow (used in both)
    TERMINAL_MINERAL: 130,            // [NEEDS/GIVES] Terminal minerals (used in both)
    TERMINAL_ENERGY_OVERFLOW: 145,    // [NEEDS] Terminal energy overflow
    
    // ===== GIVES (givesResources) - Sources that can give resources =====
    STORAGE_ENERGY_LOW: 40,           // [GIVES] Storage energy low (can give)
    STORAGE_ENERGY_HIGH: 100,         // [GIVES] Storage energy high (can give)
    TERMINAL_ENERGY_HIGH: 140,        // [GIVES] Terminal energy high (can give)
    STORAGE_MINERAL_OVERFLOW: 150,    // [GIVES] Storage mineral overflow (can give)
    TOMBSTONE: 165,                   // [GIVES] Tombstones (can give)
    RUIN: 166,                        // [GIVES] Ruins (destroyed structures, can give)
    DROPPED_RESOURCE: 170,            // [GIVES] Dropped resources (can give)
    FACTORY_OVERFLOW: 180,            // [GIVES] Factory overflow (can give)
    LAB_EMPTY: 185,                   // [GIVES] Labs with resources to empty (can give)
    CONTAINER: 195,                   // [GIVES] Containers (can give)
    LINK: 200,                        // [GIVES] Links (can give)
  },

  // Pathfinding
  PATHFINDING: {
    MAX_OPS: 4000,                   // Maximum pathfinding operations
    SWAMP_COST: 2,                    // Cost multiplier for swamps
    PLAIN_COST: 2,                    // Cost multiplier for plains
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
    FREE_RANGE: 3,                    // Free range for center point calculation
    SOURCE_COUNT_CORE: 3,             // Source count for core room type
    BORDER_MIN: 1,                    // Minimum coordinate (avoid edge)
    BORDER_MAX: 48,                   // Maximum coordinate (avoid edge)
    EDGE_MIN: 0,                      // Room edge minimum
    EDGE_MAX: 49,                     // Room edge maximum
  },

  // Defense
  DEFENSE: {
    MAX_HITS: 2155000,                // Maximum hits for defense structures
    REPAIR_LIMIT: 0.95,               // Repair limit (95% of max hits)
  },

  // Storage
  STORAGE: {
    MAX_ENERGY_THRESHOLD: 100000,     // Maximum energy threshold for storage
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

  // Fill Levels for Resources (storage, terminal, factory)
  // Note: This is a large object, kept here for reference but assigned to global in _initGlobal.js
  FILL_LEVEL: null, // Will be assigned from _initGlobal.js
};

