// Type definitions for Screeps Memory extensions
interface Memory {
  factoryLevels?: { [factoryId: string]: number };
}

// Extend CreepMemory interface
interface CreepMemory {
  role?: string;
  [key: string]: any;
}

// Extend Room prototype
interface Room {
  _checkRoomCache?(): void;
  getResourceAmount?(resource: string, structure?: string): number;
  [key: string]: any;
}

// Global extensions for _initGlobal.js
declare var global: {
  MarketCal: MarketCal;
  getRoomThreshold: (resource: string, structure?: string) => number;
  resourceImg: (resourceType: string) => string;
  globalResourcesAmount?: (resource: string) => number;
  [key: string]: any;
};

// RESOURCES_ALL is a global array
declare const RESOURCES_ALL: string[];

// Lodash is available as a global
declare const _: typeof import("lodash");

// MarketCal type definitions
interface MarketCal {
  BASE_MINERALS: string[];
  BASE_MINERALS_WITHOUT_ENERGY: string[];
  BASE_COMPOUNDS: string[];
  TIER_1_COMPOUNDS: string[];
  TIER_2_COMPOUNDS: string[];
  TIER_3_COMPOUNDS: string[];
  COMPRESSED_RESOURCES: string[];
  COMMODITIES_SETS: any;
  COMMODITIES_BASIC: any;
  COMMODITIES_LEVEL_0: string[];
  COMMODITIES_LEVEL_1: string[];
  COMMODITIES_LEVEL_2: string[];
  COMMODITIES_LEVEL_3: string[];
  COMMODITIES_LEVEL_4: string[];
  COMMODITIES_LEVEL_5: string[];
  commodity: {
    revenue: Function;
    component: Function;
    rawComponent: Function;
    bestCommodity: Function;
  };
}

// Global object extensions
declare var global: {
  MarketCal: MarketCal;
  getRoomThreshold: (resource: string, structure?: string) => number;
  resourceImg: (resourceType: string) => string;
  [key: string]: any;
};

// MarketCal as global constant
declare const MarketCal: MarketCal;

// COMMODITIES is a Screeps global constant
declare const COMMODITIES: { [resourceType: string]: { components: { [componentType: string]: number } } };

