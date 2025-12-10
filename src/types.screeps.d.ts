// Type definitions for Screeps Memory extensions
interface Memory {
  factoryLevels?: { [factoryId: string]: number };
  previousBucket?: number; // Deprecated: Use cpuAnalyzer.getPreviousBucket() instead
  cpuHistory?: Array<{
    tick: number;
    cpu: {
      used: number;
      limit: number;
      bucket: number;
    };
    rooms: {
      count: number;
      perRoom: number;
    };
  }>;
  logging?: { [tag: string]: number };
  stats?: { [key: string]: number };
  rooms?: { [roomName: string]: RoomMemory };
  Traveler?: {
    rooms?: { [roomName: string]: { avoid?: number } };
    pCache?: { [key: string]: { [cost: number]: string; uses: number } };
    Portals?: { [room: string]: { rooms?: { [room: string]: string }; shards?: { [shard: string]: { [room: string]: string } } } };
    portalUpdate?: number;
  };
}

// Extend CreepMemory interface
interface CreepMemory {
  role?: string;
  scoutTarget?: string;
  target?: string;
  targets?: Array<{
    id: string;
    action: "withdraw" | "transfer";
    resourceType: string;
    amount: number;
  }>;
  [key: string]: any;
}

// Extend RoomMemory interface for RoomPlanner
interface RoomMemory {
  planner?: {
    centerX: number | null;
    centerY: number | null;
    layoutGenerated: boolean;
    plannedStructures: Array<{
      x: number;
      y: number;
      structureType: StructureConstant;
      priority: number;
    }>;
    visualizeUntil?: number | null;
  };
  [key: string]: any;
}

// Extend Creep prototype
interface Creep {
  target?: string;
  targets?: Array<{
    id: string;
    action: "withdraw" | "transfer";
    resourceType: string;
    amount: number;
  }>;
  getTarget?(): any;
  addTarget?(id: string, action: "withdraw" | "transfer", resourceType: string, amount?: number): void;
  removeFirstTarget?(): void;
  clearTargets?(): void;
  getFirstTarget?(): any;
  getFirstTargetData?(): { id: string; action: "withdraw" | "transfer"; resourceType: string; amount: number } | null;
  [key: string]: any;
}

// Extend Source prototype
interface Source {
  container?: StructureContainer | null;
  defended?: boolean;
  memory?: any;
  _container?: StructureContainer | null;
  readonly freeSpacesCount: number;
  canHarvestSource(creep: Creep, rc: any): {
    canHarvest: boolean;
    reason?: string;
    availableSpaces: number;
    currentHarvestPower: number;
    energyWhenArriving: number;
    creepHarvestPower: number;
  };
}

// Extend Structure prototype
interface Structure {
  container?: StructureContainer | null;
  memory?: any;
  _container?: StructureContainer | null;
  needsRepair?(): boolean;
  getFirstMineral?(): { resource?: string; amount: number };
  store?: StoreDefinition;
}

// Extend RoomObject prototype
interface RoomObject {
  say?(what: string): void;
}

// Extend Room prototype
interface Room {
  _checkRoomCache?(): void;
  getResourceAmount?(resource: string, structure?: string): number;
  getRoomThreshold?(resource: string, structure?: string): number;
  roomNeedResources?(): Array<{ resourceType: string; amount: number; room: string }>;
  _needResources?: Array<{ resourceType: string; amount: number; room: string }>;
  mineral?: Mineral;
  [key: string]: any;
}

// Global extensions for _initGlobal.js
declare var global: {
  MarketCal: MarketCal;
  getRoomThreshold: (resource: string, structure?: string) => number;
  resourceImg: (resourceType: string) => string;
  globalResourcesAmount?: (resource: string) => number;
  getMyUsername: () => string | null;
  isHostileUsername: (username: string) => boolean;
  analyzeRoom: (room: Room, fullAnalysis?: boolean) => void;
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

// Module declarations for local modules
declare module "_initGlobal" {
  const initGlobal: (g: typeof global) => void;
  export = initGlobal;
}

declare module "constants" {
  const CONSTANTS: any;
  export = CONSTANTS;
}

declare module "RoomPlanner" {
  class RoomPlanner {
    constructor(room: Room);
    run(): void;
    visualize(): void;
    reset(): void;
    getStats(): any;
  }
  export = RoomPlanner;
}

// Extend RoomPosition for lookFor with string
interface RoomPosition {
  lookFor(type: string): any[];
}

