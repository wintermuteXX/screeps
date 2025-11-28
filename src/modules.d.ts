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
  export class ControllerSpawn {
    constructor(spawn: StructureSpawn, room: any);
  }
}

declare module "ControllerCreep" {
  export class ControllerCreep {
    constructor(room: any);
    run(creep: Creep): void;
  }
}

declare module "ControllerLink" {
  export class ControllerLink {
    constructor(room: any);
    transferEnergy(): void;
  }
}

declare module "ControllerTower" {
  export class ControllerTower {
    constructor(tower: StructureTower, room: any);
    fire(): void;
    repair(): void;
  }
}

declare module "ControllerTerminal" {
  export class ControllerTerminal {
    constructor(room: any);
    buyEnergyOrder(): void;
    internalTrade(): void;
    sellRoomMineralOverflow(): void;
    sellRoomMineral(): void;
    adjustWallHits(): void;
  }
}

declare module "ControllerFactory" {
  export class ControllerFactory {
    constructor(room: any);
    assignLevel(): boolean;
    setFactoryLevel(level: number): boolean;
    produce(): void;
    produceInFactory(ResourcesArray: string[], check?: boolean): boolean;
    getFactoryLevel(): number | null;
  }
}

declare module "ControllerLab" {
  export class ControllerLab {
    constructor(room: any);
    checkStatus(): void;
    produce(): void;
  }
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

