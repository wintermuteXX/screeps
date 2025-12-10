// Type definitions for local modules

declare module "constants" {
  const constants: any;
  export = constants;
}


declare module "memhack" {
  export class MemHack {
    run(): void;
  }
  const memHack: MemHack;
  export = memHack;
}

declare module "Traveler" {
  // Traveler extends Creep prototype
}

declare module "Log" {
  export class Log {
    static success(msg: string, tag?: string): void;
    static warn(msg: string, tag?: string): void;
    static error(msg: string, tag?: string): void;
    static debug(msg: string, tag?: string): void;
    static info(msg: string, tag?: string): void;
  }
  export = Log;
}

declare module "ControllerStats" {
  export function doStats(): void;
}

declare module "marketCalculator" {
  // MarketCalculator sets global.MarketCal
}

declare module "_init" {
  // _init extends prototypes
}

declare module "ControllerGame" {
  interface ControllerGame {
    checkCpuBucket(): boolean;
    updateBucketMemory(): void;
    processRooms(): void;
  }
  interface ControllerGameConstructor {
    new (): ControllerGame;
  }
  const ControllerGame: ControllerGameConstructor;
  export = ControllerGame;
}

declare module "ControllerSpawn" {
  class ControllerSpawn {
    constructor(spawn: StructureSpawn, room: any);
    createCreep(role: string, creepConfig: any, memory?: any): boolean;
    isIdle(): StructureSpawn | null;
  }
  export = ControllerSpawn;
}

declare module "ControllerCreep" {
  interface ControllerCreep {
    run(creep: Creep): void;
  }
  interface ControllerCreepConstructor {
    new (room: any): ControllerCreep;
  }
  const ControllerCreep: ControllerCreepConstructor;
  export = ControllerCreep;
}

declare module "ControllerLink" {
  interface ControllerLink {
    transferEnergy(): void;
    receivers?: any;
  }
  interface ControllerLinkConstructor {
    new (room: any): ControllerLink;
  }
  const ControllerLink: ControllerLinkConstructor;
  export = ControllerLink;
}

declare module "ControllerTower" {
  interface ControllerTower {
    fire(): void;
    heal(): boolean;
    repair(): void;
  }
  interface ControllerTowerConstructor {
    new (tower: StructureTower, room: any): ControllerTower;
  }
  const ControllerTower: ControllerTowerConstructor;
  export = ControllerTower;
}

declare module "ControllerTerminal" {
  interface ControllerTerminal {
    buyEnergyOrder(): void;
    internalTrade(): void;
    sellRoomMineralOverflow(): void;
    sellRoomMineral(): void;
    adjustWallHits(): void;
  }
  interface ControllerTerminalConstructor {
    new (room: any): ControllerTerminal;
  }
  const ControllerTerminal: ControllerTerminalConstructor;
  export = ControllerTerminal;
}

declare module "ControllerFactory" {
  interface ControllerFactory {
    assignLevel(): boolean;
    setFactoryLevel(level: number): boolean;
    produce(): void;
    produceInFactory(ResourcesArray: string[], check?: boolean): boolean;
    getFactoryLevel(): number | null;
  }
  interface ControllerFactoryConstructor {
    new (room: any): ControllerFactory;
  }
  const ControllerFactory: ControllerFactoryConstructor;
  export = ControllerFactory;
}

declare module "ControllerLab" {
  interface ControllerLab {
    checkStatus(): void;
    produce(): void;
  }
  interface ControllerLabConstructor {
    new (room: any): ControllerLab;
  }
  const ControllerLab: ControllerLabConstructor;
  export = ControllerLab;
}

declare module "config.creeps" {
  export interface CreepConfig {
    priority: number;
    levelMin?: number;
    minParts: number;
    wait4maxEnergy: boolean;
    body: BodyPartConstant[];
    behaviors: string[];
    canBuild: (rc: any) => boolean;
    produceGlobal?: boolean;
  }
  const config: { [role: string]: CreepConfig };
  export = config;
}

declare module "_behavior" {
  interface BehaviorInstance {
    when?(creep: Creep, rc: any): boolean;
    completed?(creep: Creep, rc: any): boolean;
    work?(creep: Creep, rc: any): void;
    run(creep: Creep, rc: any): void;
    [key: string]: any;
  }
  class Behavior implements BehaviorInstance {
    constructor(name: string);
    run(creep: Creep, rc: any): void;
    [key: string]: any;
  }
  export = Behavior;
}

declare module "ResourceManager" {
  interface ResourceManager {
    getResourceAmount(room: Room, resource: string, structure?: string): number;
    getRoomThreshold(resource: string, structure?: string): number;
    getGlobalResourceAmount(resource: string): number;
    getRoomNeeds(room: Room): Array<{resourceType: string; amount: number; room: string}>;
    hasEnoughResource(room: Room, resource: string, structure?: string): boolean;
  }
  const ResourceManager: ResourceManager;
  export = ResourceManager;
}

declare module "utils.username" {
  export function getMyUsername(): string | null;
  export function isHostileUsername(username: string): boolean;
}

declare module "utils.roomAnalysis" {
  export function analyzeRoom(room: Room, fullAnalysis?: boolean): void;
  export function logAnalysisSummary(room: Room, memory: any, fullAnalysis: boolean): void;
}

declare module "utils.resources" {
  export const fillLevelConfig: { [resource: string]: any };
  export function resourceImg(resourceType: string): string;
  export function globalResourcesAmount(resource: string): number;
  export function reorderResources(): void;
}

declare module "utils.console" {
  export function whatsInTerminals(): void;
  export function numberOfTerminals(): number;
  export function showLabs(): string;
  export function myResources(hide?: boolean): string;
  export function marketInfo(): string;
  export function json(x: any): string;
  export function help(category?: string): string;
  export function voiceConsole(text: string): void;
  export function visualizeLogistic(roomName?: string | null): string;
}

declare module "utils.roomPlanner" {
  export function plannerVisualize(roomName: string): void;
  export function plannerStats(roomName: string): any;
  export function plannerReset(roomName: string): void;
  export function plannerRun(roomName: string): void;
  export function plannerSetCenter(roomName: string, x: number, y: number): void;
}

declare module "utils.behaviors" {
  function createBehaviorRegistry(): {
    getBehavior(key: string): any;
    _registerBehavior(n: string): any;
  };
  export = createBehaviorRegistry;
}

declare module "utils.creeps" {
  function createCreepConfigUtils(): {
    getCreepConfig(role: string): any;
    getCreepsConfig(): any;
    getCreepRoles(): string[];
  };
  export = createCreepConfigUtils;
}

declare module "utils.roomPrototypes" {
  // Extends Room prototype
}

// Extend CreepMemory interface
interface CreepMemory {
  role?: string;
  [key: string]: any;
}

// Extend global namespace
declare global {
  function getRoomThreshold(resource: string, structure?: string): number;
  function getCreepRoles(): string[];
  function getCreepsConfig(): any;
  function resourceImg(resourceType: string): string;
}

