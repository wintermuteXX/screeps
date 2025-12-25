#!/usr/bin/env node

/**
 * Script to extract all Screeps API constants from @types/screeps
 * and generate ESLint globals configuration
 */

const fs = require("fs");
const path = require("path");

const TYPES_DIR = path.join(__dirname, "../node_modules/@types/screeps");
const OUTPUT_FILE = path.join(__dirname, "../.eslintrc.js");

// Known constant patterns from Screeps API
const CONSTANT_PATTERNS = {
  STRUCTURE: /^STRUCTURE_/,
  RESOURCE: /^RESOURCE_/,
  ERR: /^ERR_/,
  FIND: /^FIND_/,
  COLOR: /^COLOR_/,
  BODYPART: /^(MOVE|WORK|CARRY|ATTACK|RANGED_ATTACK|HEAL|CLAIM|TOUGH)$/,
  RETURN_CODE: /^(OK|ERR_NOT_OWNER|ERR_NO_PATH|ERR_NAME_EXISTS|ERR_BUSY|ERR_NOT_FOUND|ERR_NOT_ENOUGH_RESOURCES|ERR_INVALID_TARGET|ERR_FULL|ERR_NOT_IN_RANGE|ERR_INVALID_ARGS|ERR_TIRED|ERR_NO_BODYPART|ERR_RCL_NOT_ENOUGH|ERR_GCL_NOT_ENOUGH)$/,
  OTHER: /^(EXTRACTOR_COOLDOWN|HARVEST_POWER|BOOSTS|COMMODITIES|REACTION_TIME|REACTIONS|MarketCal|RoomPosition)$/,
};

// Known global objects/classes
const GLOBAL_OBJECTS = [
  "Game",
  "Memory",
  "RawMemory",
  "Creep",
  "Room",
  "Structure",
  "Spawn",
  "Source",
  "Mineral",
  "Resource",
  "Flag",
  "ConstructionSite",
  "PathFinder",
  "RoomPosition",
  "_",
];

// Known constants from Screeps API documentation
// This is a comprehensive list based on the official API
const SCREEPS_CONSTANTS = {
  // Structure Types
  STRUCTURE: [
    "STRUCTURE_SPAWN",
    "STRUCTURE_EXTENSION",
    "STRUCTURE_ROAD",
    "STRUCTURE_WALL",
    "STRUCTURE_RAMPART",
    "STRUCTURE_KEEPER_LAIR",
    "STRUCTURE_PORTAL",
    "STRUCTURE_CONTROLLER",
    "STRUCTURE_LINK",
    "STRUCTURE_STORAGE",
    "STRUCTURE_TOWER",
    "STRUCTURE_OBSERVER",
    "STRUCTURE_POWER_BANK",
    "STRUCTURE_POWER_SPAWN",
    "STRUCTURE_EXTRACTOR",
    "STRUCTURE_LAB",
    "STRUCTURE_TERMINAL",
    "STRUCTURE_CONTAINER",
    "STRUCTURE_NUKER",
    "STRUCTURE_FACTORY",
    "STRUCTURE_INVADER_CORE",
  ],

  // Resource Types
  RESOURCE: [
    "RESOURCE_ENERGY",
    "RESOURCE_POWER",
    "RESOURCE_HYDROGEN",
    "RESOURCE_OXYGEN",
    "RESOURCE_UTRIUM",
    "RESOURCE_LEMERGIUM",
    "RESOURCE_KEANIUM",
    "RESOURCE_ZYNTHIUM",
    "RESOURCE_CATALYST",
    "RESOURCE_GHODIUM",
    "RESOURCE_SILICON",
    "RESOURCE_METAL",
    "RESOURCE_BIOMASS",
    "RESOURCE_MIST",
    "RESOURCE_HYDROXIDE",
    "RESOURCE_ZYNTHIUM_KEANITE",
    "RESOURCE_UTRIUM_LEMERGITE",
    "RESOURCE_UTRIUM_HYDRIDE",
    "RESOURCE_UTRIUM_OXIDE",
    "RESOURCE_KEANIUM_HYDRIDE",
    "RESOURCE_KEANIUM_OXIDE",
    "RESOURCE_LEMERGIUM_HYDRIDE",
    "RESOURCE_LEMERGIUM_OXIDE",
    "RESOURCE_ZYNTHIUM_HYDRIDE",
    "RESOURCE_ZYNTHIUM_OXIDE",
    "RESOURCE_GHODIUM_HYDRIDE",
    "RESOURCE_GHODIUM_OXIDE",
    "RESOURCE_UTRIUM_ACID",
    "RESOURCE_UTRIUM_ALKALIDE",
    "RESOURCE_KEANIUM_ACID",
    "RESOURCE_KEANIUM_ALKALIDE",
    "RESOURCE_LEMERGIUM_ACID",
    "RESOURCE_LEMERGIUM_ALKALIDE",
    "RESOURCE_ZYNTHIUM_ACID",
    "RESOURCE_ZYNTHIUM_ALKALIDE",
    "RESOURCE_GHODIUM_ACID",
    "RESOURCE_GHODIUM_ALKALIDE",
    "RESOURCE_CATALYZED_UTRIUM_ACID",
    "RESOURCE_CATALYZED_UTRIUM_ALKALIDE",
    "RESOURCE_CATALYZED_KEANIUM_ACID",
    "RESOURCE_CATALYZED_KEANIUM_ALKALIDE",
    "RESOURCE_CATALYZED_LEMERGIUM_ACID",
    "RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE",
    "RESOURCE_CATALYZED_ZYNTHIUM_ACID",
    "RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE",
    "RESOURCE_CATALYZED_GHODIUM_ACID",
    "RESOURCE_CATALYZED_GHODIUM_ALKALIDE",
    "RESOURCE_OPS",
    "RESOURCE_UTRIUM_BAR",
    "RESOURCE_LEMERGIUM_BAR",
    "RESOURCE_ZYNTHIUM_BAR",
    "RESOURCE_KEANIUM_BAR",
    "RESOURCE_GHODIUM_MELT",
    "RESOURCE_OXIDANT",
    "RESOURCE_REDUCTANT",
    "RESOURCE_PURIFIER",
    "RESOURCE_BATTERY",
    "RESOURCE_COMPOSITE",
    "RESOURCE_CRYSTAL",
    "RESOURCE_LIQUID",
    "RESOURCE_WIRE",
    "RESOURCE_SWITCH",
    "RESOURCE_TRANSISTOR",
    "RESOURCE_MICROCHIP",
    "RESOURCE_CIRCUIT",
    "RESOURCE_DEVICE",
    "RESOURCE_CELL",
    "RESOURCE_PHLEGM",
    "RESOURCE_TISSUE",
    "RESOURCE_MUSCLE",
    "RESOURCE_ORGANOID",
    "RESOURCE_ORGANISM",
    "RESOURCE_ALLOY",
    "RESOURCE_TUBE",
    "RESOURCE_FIXTURES",
    "RESOURCE_FRAME",
    "RESOURCE_HYDRAULICS",
    "RESOURCE_MACHINE",
    "RESOURCE_CONDENSATE",
    "RESOURCE_CONCENTRATE",
    "RESOURCE_EXTRACT",
    "RESOURCE_SPIRIT",
    "RESOURCE_EMANATION",
    "RESOURCE_ESSENCE",
  ],

  // Error Codes (from https://docs.screeps.com/api/#Constants)
  ERR: [
    "ERR_NOT_OWNER",              // -1
    "ERR_NO_PATH",                // -2
    "ERR_NAME_EXISTS",            // -3
    "ERR_BUSY",                   // -4
    "ERR_NOT_FOUND",              // -5
    "ERR_NOT_ENOUGH_ENERGY",      // -6
    "ERR_NOT_ENOUGH_RESOURCES",  // -6 (alias)
    "ERR_INVALID_TARGET",         // -7
    "ERR_FULL",                   // -8
    "ERR_NOT_IN_RANGE",           // -9
    "ERR_INVALID_ARGS",           // -10
    "ERR_TIRED",                  // -11
    "ERR_NO_BODYPART",            // -12
    "ERR_NOT_ENOUGH_EXTENSIONS", // -6 (for extensions)
    "ERR_RCL_NOT_ENOUGH",         // -14
    "ERR_GCL_NOT_ENOUGH",         // -15
  ],

  // Find Constants
  FIND: [
    "FIND_EXIT_TOP",
    "FIND_EXIT_RIGHT",
    "FIND_EXIT_BOTTOM",
    "FIND_EXIT_LEFT",
    "FIND_EXIT",
    "FIND_CREEPS",
    "FIND_MY_CREEPS",
    "FIND_HOSTILE_CREEPS",
    "FIND_SOURCES_ACTIVE",
    "FIND_SOURCES",
    "FIND_DROPPED_RESOURCES",
    "FIND_STRUCTURES",
    "FIND_MY_STRUCTURES",
    "FIND_HOSTILE_STRUCTURES",
    "FIND_FLAGS",
    "FIND_CONSTRUCTION_SITES",
    "FIND_MY_SPAWNS",
    "FIND_HOSTILE_SPAWNS",
    "FIND_MY_CONSTRUCTION_SITES",
    "FIND_HOSTILE_CONSTRUCTION_SITES",
    "FIND_MINERALS",
    "FIND_NUKES",
    "FIND_TOMBSTONES",
    "FIND_POWER_CREEPS",
    "FIND_MY_POWER_CREEPS",
    "FIND_HOSTILE_POWER_CREEPS",
    "FIND_DEPOSITS",
    "FIND_RUINS",
  ],

  // Colors
  COLOR: [
    "COLOR_RED",
    "COLOR_PURPLE",
    "COLOR_BLUE",
    "COLOR_CYAN",
    "COLOR_GREEN",
    "COLOR_YELLOW",
    "COLOR_ORANGE",
    "COLOR_BROWN",
    "COLOR_GREY",
    "COLOR_WHITE",
  ],

  // Body Parts
  BODYPART: [
    "MOVE",
    "WORK",
    "CARRY",
    "ATTACK",
    "RANGED_ATTACK",
    "TOUGH",
    "HEAL",
    "CLAIM",
  ],

  // Return Codes
  RETURN_CODE: ["OK"],

  // Terrain Masks (from https://docs.screeps.com/api/#Constants)
  TERRAIN: [
    "TERRAIN_MASK_WALL",      // 1 - Wall terrain
    "TERRAIN_MASK_SWAMP",     // 2 - Swamp terrain
    "TERRAIN_MASK_LAVA",      // 4 - Lava terrain
  ],

  // Power Constants (from https://docs.screeps.com/api/#Constants)
  PWR: [
    "PWR_GENERATE_OPS",       // Generate ops resource
    "PWR_OPERATE_SPAWN",      // Operate spawn
    "PWR_OPERATE_TOWER",      // Operate tower
    "PWR_OPERATE_STORAGE",    // Operate storage
    "PWR_OPERATE_LAB",        // Operate lab
    "PWR_OPERATE_EXTENSION",  // Operate extension
    "PWR_OPERATE_OBSERVER",   // Operate observer
    "PWR_OPERATE_TERMINAL",   // Operate terminal
    "PWR_DISRUPT_SPAWN",      // Disrupt spawn
    "PWR_DISRUPT_TOWER",      // Disrupt tower
    "PWR_DISRUPT_SOURCE",     // Disrupt source
    "PWR_SHIELD",             // Shield
    "PWR_REGEN_SOURCE",       // Regenerate source
    "PWR_REGEN_MINERAL",      // Regenerate mineral
    "PWR_DISRUPT_TERMINAL",   // Disrupt terminal
    "PWR_OPERATE_POWER",      // Operate power
    "PWR_FORTIFY",            // Fortify
    "PWR_OPERATE_CONTROLLER", // Operate controller
    "PWR_OPERATE_FACTORY",    // Operate factory
  ],

  // Other Constants
  OTHER: [
    "EXTRACTOR_COOLDOWN",
    "HARVEST_POWER",
    "BOOSTS",
    "COMMODITIES",
    "REACTION_TIME",
    "REACTIONS",
    "MarketCal",
    "RoomPosition",
    "RESOURCES_ALL",
    "DENSITY_LOW",            // Mineral density
    "DENSITY_MODERATE",       // Mineral density
    "DENSITY_HIGH",           // Mineral density
    "DENSITY_ULTRA",          // Mineral density
  ],
};

function generateGlobals() {
  const globals = {};

  // Add global objects
  GLOBAL_OBJECTS.forEach((obj) => {
    globals[obj] = "readonly";
  });

  // Add all constants
  Object.values(SCREEPS_CONSTANTS).flat().forEach((constant) => {
    globals[constant] = "readonly";
  });

  return globals;
}

function formatGlobals(globals) {
  const entries = Object.entries(globals).sort(([a], [b]) => a.localeCompare(b));
  const lines = entries.map(([key, value]) => `        "${key}": "${value}",`);
  return lines.join("\n");
}

function updateEslintConfig() {
  const eslintConfigPath = OUTPUT_FILE;
  let configContent = fs.readFileSync(eslintConfigPath, "utf8");

  // Generate new globals
  const globals = generateGlobals();
  const globalsString = formatGlobals(globals);

  // Find and replace the globals section
  // Match from "globals: {" to the closing "}," with proper brace matching
  const globalsStart = configContent.indexOf('globals: {');
  if (globalsStart === -1) {
    console.error("❌ Could not find globals section in ESLint config");
    process.exit(1);
  }

  // Find the matching closing brace
  let braceCount = 0;
  let i = globalsStart + 'globals: {'.length;
  let globalsEnd = -1;
  
  for (; i < configContent.length; i++) {
    if (configContent[i] === '{') braceCount++;
    if (configContent[i] === '}') {
      if (braceCount === 0) {
        globalsEnd = i + 1;
        break;
      }
      braceCount--;
    }
  }

  if (globalsEnd === -1) {
    console.error("❌ Could not find end of globals section");
    process.exit(1);
  }

  // Extract the indentation before "globals:"
  const beforeGlobals = configContent.substring(0, globalsStart);
  const indentMatch = beforeGlobals.match(/(\s+)$/);
  const indent = indentMatch ? indentMatch[1] : '      ';
  
  // Replace the globals section
  const before = configContent.substring(0, globalsStart);
  const after = configContent.substring(globalsEnd);
  const newGlobalsSection = `${indent}globals: {\n${globalsString}\n${indent}},`;
  
  configContent = before + newGlobalsSection + after;
  console.log("✅ Found existing globals section, replacing...");

  // Write back
  fs.writeFileSync(eslintConfigPath, configContent, "utf8");
  console.log(`✅ Updated ${eslintConfigPath} with ${Object.keys(globals).length} globals`);
  console.log(`   - ${SCREEPS_CONSTANTS.STRUCTURE.length} STRUCTURE_* constants`);
  console.log(`   - ${SCREEPS_CONSTANTS.RESOURCE.length} RESOURCE_* constants`);
  console.log(`   - ${SCREEPS_CONSTANTS.ERR.length} ERR_* constants`);
  console.log(`   - ${SCREEPS_CONSTANTS.FIND.length} FIND_* constants`);
  console.log(`   - ${SCREEPS_CONSTANTS.COLOR.length} COLOR_* constants`);
  console.log(`   - ${SCREEPS_CONSTANTS.PWR.length} PWR_* constants`);
  console.log(`   - ${SCREEPS_CONSTANTS.TERRAIN.length} TERRAIN_MASK_* constants`);
  console.log(`   - ${GLOBAL_OBJECTS.length} global objects`);
}

// Run
try {
  console.log("🔧 Generating ESLint globals from Screeps API constants...");
  updateEslintConfig();
  console.log("✅ Done!");
} catch (error) {
  console.error("❌ Error:", error.message);
  console.error(error.stack);
  process.exit(1);
}

