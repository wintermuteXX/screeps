// Type definitions for local modules

declare module "constants" {
  const constants: any;
  export = constants;
}

declare module "screeps-profiler" {
  export function wrap(fn: Function): void;
  export function enable(): void;
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
  class ControllerGame {
    processRooms(): void;
  }
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
    body2: BodyPartConstant[];
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

// Extend CreepMemory interface
interface CreepMemory {
  role?: string;
  [key: string]: any;
}

// Log is available globally
declare const Log: typeof import("./Log").default;

