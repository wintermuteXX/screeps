# Refactoring-Vorschläge für Screeps Codebase

## Übersicht

Dieses Dokument enthält umfassende Vorschläge für strukturelle Verbesserungen und Screeps-spezifische Optimierungen der gesamten `src/` Codebase.

## ⚠️ WICHTIGE SCREEPS-LIMITATIONEN

**Diese Einschränkungen müssen bei allen Refactoring-Entscheidungen berücksichtigt werden:**

1. **Keine Unterordner**: Alle Dateien müssen flach in `src/` liegen
2. **ECMAScript 2017**: Nur ES2017-Features sind verfügbar
   - ✅ Klassen, Arrow Functions, `const/let`, Template Literals, Destructuring, `async/await`, `Map/Set`
   - ❌ Optional Chaining (`?.`), Nullish Coalescing (`??`), Private Fields (`#field`)
3. **CommonJS Modules**: `require()` und `module.exports` (kein ES6 `import/export`)
4. **Dateinamen**: Präfix-basierte Namenskonvention statt Ordnerstruktur

**Alle Vorschläge in diesem Dokument berücksichtigen diese Limitationen.**

---

## 1. STRUKTURELLE REORGANISATION

### 1.1 Dateinamen-Konventionen (flache Struktur)

**WICHTIG:** Screeps unterstützt keine Unterordner! Alle Dateien müssen flach in `src/` liegen.

**Aktueller Zustand:**
- Alle Dateien flach in `src/`
- Inkonsistente Namenskonventionen (`_init.js`, `behavior.*.js`, `Controller*.js`)

**Vorschlag - Konsistente Namenskonventionen:**
```
src/
├── main.js
├── controller.game.js (umbenannt von ControllerGame.js)
├── controller.room.js (umbenannt von ControllerRoom.js)
├── controller.room.creeps.js (neue Datei - Creep-Management)
├── controller.room.structures.js (neue Datei - Structure-Management)
├── controller.room.logistics.js (neue Datei - Resource-Logistics)
│
├── controller.creep.js (umbenannt von ControllerCreep.js)
├── controller.spawn.js (umbenannt von ControllerSpawn.js)
├── controller.tower.js (umbenannt von ControllerTower.js)
├── controller.link.js (umbenannt von ControllerLink.js)
├── controller.terminal.js (umbenannt von ControllerTerminal.js)
├── controller.factory.js (umbenannt von ControllerFactory.js)
├── controller.lab.js (umbenannt von ControllerLab.js)
│
├── behavior.base.js (umbenannt von _behavior.js)
├── behavior.resource.get.js (umbenannt von behavior.get_resources.js)
├── behavior.resource.transfer.js (umbenannt von behavior.transfer_resources.js)
├── behavior.resource.harvest.js (umbenannt von behavior.harvest.js)
├── behavior.resource.find_energy.js (umbenannt von behavior.find_near_energy.js)
│
├── behavior.work.build.js (umbenannt von behavior.build_structures.js)
├── behavior.work.repair.js (umbenannt von behavior.repair.js)
├── behavior.work.upgrade.js (umbenannt von behavior.upgrade_controller.js)
├── behavior.work.miner.js (umbenannt von behavior.miner_harvest.js)
├── behavior.work.miner_mineral.js (umbenannt von behavior.miner_harvest_mineral.js)
├── behavior.work.miner_commodity.js (umbenannt von behavior.miner_harvest_commodities.js)
├── behavior.work.miner_raid.js (umbenannt von behavior.miner_raid_room.js)
│
├── behavior.combat.attack.js (umbenannt von behavior.attack_enemy.js)
├── behavior.combat.clear.js (umbenannt von behavior.clear_enemy_buildings.js)
│
├── behavior.movement.flag.js (umbenannt von behavior.goto_flag.js)
├── behavior.movement.home.js (umbenannt von behavior.goto_home.js)
├── behavior.movement.scout.js (umbenannt von behavior.scout.js)
│
├── behavior.special.claim.js (umbenannt von behavior.claim_controller.js)
├── behavior.special.place_spawn.js (umbenannt von behavior.place_spawn.js)
├── behavior.special.recycle.js (umbenannt von behavior.recycle.js)
├── behavior.special.renew.js (umbenannt von behavior.renew.js)
├── behavior.special.sign.js (umbenannt von behavior.sign_controller.js)
├── behavior.special.transfer_storage.js (umbenannt von behavior.transfer_storage.js)
│
├── service.resource.js (umbenannt von ResourceManager.js)
├── service.planner.js (umbenannt von RoomPlanner.js)
├── service.market.js (umbenannt von marketCalculator.js)
├── service.cpu.js (umbenannt von CpuAnalyzer.js)
│
├── utils.behaviors.js
├── utils.creeps.js
├── utils.resources.js
├── utils.room.analysis.js (umbenannt von utils.roomAnalysis.js)
├── utils.room.planner.js (umbenannt von utils.roomPlanner.js)
├── utils.room.prototypes.js (umbenannt von utils.roomPrototypes.js)
├── utils.username.js
├── utils.console.js
├── utils.errors.js
│
├── config.constants.js (umbenannt von constants.js)
├── config.creeps.js
│
├── prototype.init.js (umbenannt von _init.js)
├── prototype.global.js (umbenannt von _initGlobal.js)
│
├── lib.traveler.js (umbenannt von Traveler.js)
├── lib.memhack.js (umbenannt von memhack.js)
├── lib.log.js (umbenannt von Log.js)
│
├── types.screeps.d.ts (umbenannt von screeps.d.ts)
└── types.modules.d.ts (umbenannt von modules.d.ts)
```

**Namenskonvention:**
- `controller.*.js` - Controller-Klassen
- `behavior.<kategorie>.<name>.js` - Behaviors nach Kategorie gruppiert
- `service.*.js` - Service-Klassen
- `utils.*.js` - Utility-Funktionen
- `config.*.js` - Konfigurationsdateien
- `prototype.*.js` - Prototype-Erweiterungen
- `lib.*.js` - Externe Bibliotheken

**require()-Pfade:**
```javascript
// Alle require()-Statements verwenden Dateinamen ohne .js
const RoomController = require('./controller.room');
const RepairBehavior = require('./behavior.work.repair');
const ResourceManager = require('./service.resource');
const CacheManager = require('./utils.cache');
const CONSTANTS = require('./config.constants');
```

**Vorteile:**
- Klare Gruppierung durch Namenskonvention (keine Ordner nötig)
- Einfacheres Navigieren durch konsistente Präfixe
- Alphabetische Sortierung gruppiert verwandte Dateien
- Keine Screeps-Limitationen verletzt
- Einfache require()-Pfade (relativ zu aktueller Datei)

---

## 2. CODE-MODERNISIERUNG

### 2.1 ES2017 Features nutzen

**WICHTIG:** Screeps unterstützt ECMAScript 2017. Verfügbare Features:
- ✅ Klassen (`class`)
- ✅ Arrow Functions (`=>`)
- ✅ `const`/`let`
- ✅ Template Literals
- ✅ Destructuring
- ✅ `async/await`
- ✅ `Map`/`Set`
- ❌ Optional Chaining (`?.`) - nicht verfügbar
- ❌ Nullish Coalescing (`??`) - nicht verfügbar
- ❌ Private Fields (`#field`) - nicht verfügbar

**Aktueller Zustand:**
- Mix aus `function` und `class`
- Viele `var` statt `const/let`
- Prototype-basierte Klassen

**Vorschläge:**

#### 2.1.1 ControllerRoom.js → ES2017 Klasse umwandeln

**WICHTIG:** ES2017 unterstützt Klassen, aber keine optional chaining (`?.`) oder nullish coalescing (`??`).

```javascript
// Vorher (Prototype-basiert)
function ControllerRoom(room, ControllerGame) {
  this.room = room;
  // ...
}
ControllerRoom.prototype.run = function() { /* ... */ };

// Nachher (ES2017 Klasse)
class RoomController {
  constructor(room, gameController) {
    this.room = room;
    this.gameController = gameController;
    this._cache = new Map();
    this._initialize();
  }
  
  run() {
    this._resetCaches();
    this._populate();
    this._processStructures();
    this._commandCreeps();
  }
  
  _initialize() {
    // Initialisierung
  }
  
  _resetCaches() {
    this._cache.clear();
  }
}
```

#### 2.1.2 Behavior-System modernisieren (ES2017)

```javascript
// behavior.base.js (umbenannt von _behavior.js)
class Behavior {
  constructor(name) {
    this.name = name;
  }
  
  when(creep, roomController) {
    return false;
  }
  
  completed(creep, roomController) {
    return true;
  }
  
  work(creep, roomController) {
    // Override in subclasses
  }
}

module.exports = Behavior;

// behavior.work.repair.js (umbenannt von behavior.repair.js)
const Behavior = require('./behavior.base');

class RepairBehavior extends Behavior {
  constructor() {
    super('repair');
  }
  
  when(creep, rc) {
    if (creep.store.getUsedCapacity() === 0) {
      return false;
    }
    const structures = rc.findStructuresToRepair();
    return structures.length > 0;
  }
  
  completed(creep, rc) {
    const target = creep.getTarget();
    if (creep.store.getUsedCapacity() === 0) {
      return true;
    }
    if (!target) {
      return true;
    }
    return target.hits === target.hitsMax;
  }
  
  work(creep, rc) {
    let target = creep.getTarget();
    
    if (!target) {
      const structures = rc.findStructuresToRepair();
      if (structures.length) {
        target = structures[0];
        creep.target = target.id;
      }
    }
    
    if (target) {
      const result = creep.repair(target);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(target);
      }
    }
  }
}

module.exports = new RepairBehavior();
```

---

## 3. GROSSE DATEIEN AUFSPALTEN

### 3.1 ControllerRoom.js (1351 Zeilen) → Aufteilen

**Vorschlag (flache Struktur):**

```
src/
├── controller.room.js (Hauptklasse, ~200 Zeilen)
├── controller.room.creeps.js (neue Datei - Creep-Management)
├── controller.room.structures.js (neue Datei - Structure-Management)
├── controller.room.logistics.js (neue Datei - Resource-Logistics)
└── service.resource.js (bereits vorhanden, erweitern)
```

**Aufteilung:**

```javascript
// controller.room.creeps.js
const ControllerCreep = require('./controller.creep');

class CreepManager {
  constructor(roomController) {
    this.rc = roomController;
    this._creepController = new ControllerCreep(roomController);
  }
  
  getAllCreeps(role) {
    // Logik aus ControllerRoom.getAllCreeps
    if (this.rc._creepsByRole === null) {
      this.rc._creepsByRole = {};
      const creeps = this.rc.find(FIND_MY_CREEPS);
      for (const creep of creeps) {
        const r = creep.role || 'none';
        if (!this.rc._creepsByRole[r]) {
          this.rc._creepsByRole[r] = [];
        }
        this.rc._creepsByRole[r].push(creep);
      }
    }
    
    if (role) {
      return this.rc._creepsByRole[role] || [];
    }
    
    const all = [];
    for (const r in this.rc._creepsByRole) {
      all.push(...this.rc._creepsByRole[r]);
    }
    return all;
  }
  
  getCreeps(role, target) {
    // Logik aus ControllerRoom.getCreeps
    let creeps = this.rc.find(FIND_MY_CREEPS);
    
    if (role || target) {
      const filter = { memory: {} };
      if (role) filter.memory.role = role;
      if (target) filter.memory.target = target;
      creeps = creeps.filter(c => {
        if (role && c.memory.role !== role) return false;
        if (target && c.memory.target !== target) return false;
        return true;
      });
    }
    
    return creeps;
  }
  
  commandCreeps() {
    const creeps = this.rc.find(FIND_MY_CREEPS);
    for (const creep of creeps) {
      this._creepController.run(creep);
    }
  }
}

module.exports = CreepManager;

// controller.room.logistics.js
class LogisticsManager {
  constructor(roomController) {
    this.rc = roomController;
  }
  
  givesResources() {
    // Logik aus ControllerRoom.givesResources
    if (!this.rc._givesResources) {
      this.rc._givesResources = [];
      // ... Implementierung
    }
    return this.rc._givesResources;
  }
  
  needsResources() {
    // Logik aus ControllerRoom.needsResources
    if (!this.rc._needsResources) {
      this.rc._needsResources = [];
      // ... Implementierung
    }
    return this.rc._needsResources;
  }
  
  getPickupOrder(creep) {
    // Logik aus ControllerRoom.getPickupOrder
  }
  
  getDeliveryOrder(creep, resourceType) {
    // Logik aus ControllerRoom.getDeliveryOrder
  }
}

module.exports = LogisticsManager;

// controller.room.js (Hauptklasse)
const CreepManager = require('./controller.room.creeps');
const LogisticsManager = require('./controller.room.logistics');
const ResourceManager = require('./service.resource');

class RoomController {
  constructor(room, gameController) {
    this.room = room;
    this.gameController = gameController;
    this.creepManager = new CreepManager(this);
    this.logisticsManager = new LogisticsManager(this);
    this.resourceManager = new ResourceManager();
    this._cache = new Map();
  }
  
  run() {
    this._resetCaches();
    this._populate();
    this.creepManager.commandCreeps();
    this.logisticsManager.run();
  }
  
  _resetCaches() {
    this._cache.clear();
    this._creepsByRole = null;
    this._givesResources = null;
    this._needsResources = null;
  }
  
  _populate() {
    // Spawn-Logik
  }
}

module.exports = RoomController;
```

### 3.2 Traveler.js (1324 Zeilen) → Modularisieren

**Vorschlag (flache Struktur):**

```
src/
├── lib.traveler.js (Hauptklasse, ~300 Zeilen)
├── lib.traveler.cache.js (Caching-Logik)
├── lib.traveler.pathfinding.js (Pathfinding-Algorithmus)
├── lib.traveler.movement.js (Bewegungslogik)
└── lib.traveler.room.js (Room-Status-Analyse)
```

### 3.3 RoomPlanner.js (1153 Zeilen) → Aufteilen

**Vorschlag (flache Struktur):**

```
src/
├── service.planner.js (Hauptklasse)
├── service.planner.layout.js (Layout-Berechnung)
├── service.planner.placement.js (Struktur-Platzierung)
├── service.planner.roads.js (Road-Bau-Logik)
└── service.planner.visual.js (Visualisierungs-Logik)
```

### 3.4 _init.js (639 Zeilen) → Aufteilen

**Vorschlag (flache Struktur):**

```
src/
├── prototype.init.js (Haupt-Initialisierung)
├── prototype.creep.js (Creep-Prototype-Erweiterungen)
├── prototype.structure.js (Structure-Prototype-Erweiterungen)
├── prototype.room.js (Room-Prototype-Erweiterungen)
└── prototype.position.js (RoomPosition-Prototype-Erweiterungen)
```

---

## 4. SCREEPS-SPEZIFISCHE OPTIMIERUNGEN

### 4.1 CPU-Optimierungen

#### 4.1.1 Aggressiveres Caching

**Aktuell:**
- Viele `find()` Aufrufe pro Tick
- Wiederholte Berechnungen

**Vorschlag:**

```javascript
// utils.cache.js (neue Datei)
class CacheManager {
  constructor() {
    this._cache = new Map();
    this._tick = null;
  }
  
  get(key, factory) {
    if (this._tick !== Game.time) {
      this._cache.clear();
      this._tick = Game.time;
    }
    
    if (!this._cache.has(key)) {
      this._cache.set(key, factory());
    }
    
    return this._cache.get(key);
  }
  
  clear() {
    this._cache.clear();
  }
}

module.exports = CacheManager;

// Verwendung in controller.room.js
const CacheManager = require('./utils.cache');

class RoomController {
  constructor(room, gameController) {
    this.room = room;
    this.gameController = gameController;
    this.cache = new CacheManager();
  }
  
  find(type) {
    return this.cache.get(`find_${type}`, () => {
      return this.room.find(type);
    });
  }
  
  getEnemies() {
    return this.cache.get('enemies', () => {
      return this.room.find(FIND_HOSTILE_CREEPS);
    });
  }
}

module.exports = RoomController;
```

#### 4.1.2 Batch-Processing für Creeps

**Aktuell:**
- Jeder Creep wird einzeln verarbeitet
- Viele redundante Berechnungen

**Vorschlag:**

```javascript
// controller.room.creeps.js
class CreepManager {
  constructor(roomController) {
    this.rc = roomController;
  }
  
  commandCreeps() {
    const creeps = this.rc.find(FIND_MY_CREEPS);
    
    // Batch-Verarbeitung nach Role
    const creepsByRole = this._groupByRole(creeps);
    
    // ES2017: Map.entries() ist verfügbar
    for (const entry of creepsByRole.entries()) {
      const role = entry[0];
      const roleCreeps = entry[1];
      
      // Gemeinsame Berechnungen für alle Creeps einer Role
      const sharedContext = this._prepareContext(role);
      
      for (const creep of roleCreeps) {
        this._processCreep(creep, sharedContext);
      }
    }
  }
  
  _groupByRole(creeps) {
    const groups = new Map();
    for (const creep of creeps) {
      const role = creep.role || 'default';
      if (!groups.has(role)) {
        groups.set(role, []);
      }
      groups.get(role).push(creep);
    }
    return groups;
  }
  
  _prepareContext(role) {
    // Gemeinsame Berechnungen für alle Creeps dieser Role
    return {
      role: role,
      // ... weitere gemeinsame Daten
    };
  }
  
  _processCreep(creep, context) {
    // Individuelle Creep-Verarbeitung
  }
}

module.exports = CreepManager;
```

#### 4.1.3 Lazy Evaluation für teure Operationen

**Vorschlag:**

```javascript
// Nur ausführen wenn CPU verfügbar
class RoomController {
  run() {
    // Kritische Operationen immer
    this._populate();
    this._commandCreeps();
    
    // Optionale Operationen nur bei CPU-Verfügbarkeit
    if (this._hasCpuAvailable()) {
      this._updateStatistics();
    }
    
    if (this._hasCpuAvailable(CONSTANTS.CPU.BUCKET_HIGH)) {
      this._runExpensiveAnalysis();
    }
  }
  
  _hasCpuAvailable(threshold = CONSTANTS.CPU.BUCKET_MEDIUM) {
    const remaining = Game.cpu.limit - Game.cpu.getUsed();
    return remaining > 0 && Game.cpu.bucket > threshold;
  }
}
```

### 4.2 Memory-Optimierungen

#### 4.2.1 Memory-Struktur vereinfachen

**Aktuell:**
- Viele verschachtelte Memory-Strukturen
- Redundante Daten

**Vorschlag:**

```javascript
// utils.memory.js (neue Datei)
class MemoryManager {
  static cleanup() {
    // Entferne verwaiste Memory-Einträge
    this._cleanupRooms();
    this._cleanupCreeps();
    this._cleanupStructures();
  }
  
  static _cleanupRooms() {
    for (const roomName in Memory.rooms) {
      if (!Game.rooms[roomName]) {
        delete Memory.rooms[roomName];
      }
    }
  }
  
  static _cleanupCreeps() {
    for (const name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
      }
    }
  }
  
  static _cleanupStructures() {
    // Struktur-Cleanup-Logik
  }
  
  // Komprimierung von Memory-Daten
  static compressRoomMemory(roomName) {
    const memory = Memory.rooms[roomName];
    if (!memory) return;
    
    // Entferne alte Cache-Daten
    if (memory._cache) {
      delete memory._cache;
    }
    
    // Komprimiere Struktur-Daten
    if (memory.structures) {
      // Nur aktive Strukturen behalten
      for (const type in memory.structures) {
        const structures = memory.structures[type];
        for (const id in structures) {
          if (!Game.getObjectById(id)) {
            delete structures[id];
          }
        }
      }
    }
  }
}

module.exports = MemoryManager;
```

#### 4.2.2 Memory-Pooling für häufig genutzte Daten

**Vorschlag:**

```javascript
// utils.memory.pool.js (neue Datei)
class MemoryPool {
  constructor() {
    this._pools = new Map();
  }
  
  getPool(key) {
    if (!this._pools.has(key)) {
      this._pools.set(key, []);
    }
    return this._pools.get(key);
  }
  
  acquire(key, factory) {
    const pool = this.getPool(key);
    if (pool.length > 0) {
      return pool.pop();
    }
    return factory();
  }
  
  release(key, obj) {
    // Reset object
    for (const prop in obj) {
      delete obj[prop];
    }
    this.getPool(key).push(obj);
  }
}

module.exports = MemoryPool;
```

### 4.3 Pathfinding-Optimierungen

#### 4.3.1 Intelligente Path-Cache-Strategie

**Vorschlag:**

```javascript
// lib.traveler.cache.js
class PathCache {
  constructor() {
    this._cache = new Map();
    this._usage = new Map();
    this._maxSize = 1000;
  }
  
  get(key) {
    const path = this._cache.get(key);
    if (path) {
      const currentUsage = this._usage.get(key) || 0;
      this._usage.set(key, currentUsage + 1);
    }
    return path;
  }
  
  set(key, path) {
    // Nur lange Pfade cachen
    if (path.length < 20) {
      return;
    }
    
    // Cache-Limit einhalten
    if (this._cache.size >= this._maxSize) {
      this._evictLeastUsed();
    }
    
    this._cache.set(key, path);
    this._usage.set(key, 1);
  }
  
  _evictLeastUsed() {
    let minKey = null;
    let minUsage = Infinity;
    
    // ES2017: Map.entries() ist verfügbar
    for (const entry of this._usage.entries()) {
      const key = entry[0];
      const usage = entry[1];
      if (usage < minUsage) {
        minUsage = usage;
        minKey = key;
      }
    }
    
    if (minKey) {
      this._cache.delete(minKey);
      this._usage.delete(minKey);
    }
  }
}

module.exports = PathCache;
```

---

## 5. CODE-QUALITÄT VERBESSERUNGEN

### 5.1 TypeScript/Type Definitions erweitern

**Vorschlag:**

```typescript
// types/controllers.d.ts
interface RoomController {
  room: Room;
  creepManager: CreepManager;
  structureManager: StructureManager;
  logisticsManager: LogisticsManager;
  
  run(): void;
  find(type: FindConstant): FindResult[];
  getAllCreeps(role?: string): Creep[];
}

// types/behaviors.d.ts
interface Behavior {
  name: string;
  when(creep: Creep, rc: RoomController): boolean;
  completed(creep: Creep, rc: RoomController): boolean;
  work(creep: Creep, rc: RoomController): void;
}
```

### 5.2 Error Handling verbessern

**Vorschlag:**

```javascript
// utils/errors.js (erweitern)
class ScreepsError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'ScreepsError';
    this.context = context;
    this.tick = Game.time;
  }
}

class BehaviorError extends ScreepsError {
  constructor(behaviorName, message, context) {
    super(`Behavior ${behaviorName}: ${message}`, context);
    this.name = 'BehaviorError';
    this.behaviorName = behaviorName;
  }
}

// Wrapper für Behavior-Ausführung
function safeExecuteBehavior(behavior, creep, rc) {
  try {
    behavior.work(creep, rc);
  } catch (error) {
    Log.error(`Error in behavior ${behavior.name}: ${error.message}`, 'Behavior', {
      creep: creep.name,
      room: rc.room.name,
      stack: error.stack
    });
    
    // Fallback-Verhalten
    creep.behavior = null;
  }
}
```

### 5.3 Logging-System verbessern

**Vorschlag:**

```javascript
// lib/Log.js (erweitern)
class Logger {
  constructor() {
    this._levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this._currentLevel = this._levels.INFO;
  }
  
  error(message, category = 'General', context = {}) {
    this._log('ERROR', message, category, context);
  }
  
  warn(message, category = 'General', context = {}) {
    if (this._currentLevel >= this._levels.WARN) {
      this._log('WARN', message, category, context);
    }
  }
  
  info(message, category = 'General', context = {}) {
    if (this._currentLevel >= this._levels.INFO) {
      this._log('INFO', message, category, context);
    }
  }
  
  debug(message, category = 'General', context = {}) {
    if (this._currentLevel >= this._levels.DEBUG) {
      this._log('DEBUG', message, category, context);
    }
  }
  
  _log(level, message, category, context) {
    const timestamp = `[${Game.time}]`;
    const categoryStr = category ? `[${category}]` : '';
    const contextStr = Object.keys(context).length > 0 
      ? ` ${JSON.stringify(context)}` 
      : '';
    
    console.log(`${timestamp} ${level} ${categoryStr} ${message}${contextStr}`);
  }
  
  // CPU-Tracking
  measure(label, fn) {
    const start = Game.cpu.getUsed();
    const result = fn();
    const end = Game.cpu.getUsed();
    const duration = end - start;
    
    if (duration > 0.1) {
      this.debug(`${label} took ${duration.toFixed(3)} CPU`, 'Performance');
    }
    
    return result;
  }
}
```

---

## 6. ARCHITEKTUR-VERBESSERUNGEN

### 6.1 Dependency Injection

**Vorschlag:**

```javascript
// utils.container.js (neue Datei)
class ServiceContainer {
  constructor() {
    this._services = new Map();
    this._singletons = new Map();
  }
  
  register(name, factory, singleton) {
    if (singleton === undefined) {
      singleton = true;
    }
    this._services.set(name, { factory: factory, singleton: singleton });
  }
  
  get(name) {
    const service = this._services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    
    if (service.singleton) {
      if (!this._singletons.has(name)) {
        this._singletons.set(name, service.factory(this));
      }
      return this._singletons.get(name);
    }
    
    return service.factory(this);
  }
}

module.exports = ServiceContainer;

// Verwendung in main.js oder _initGlobal.js
const ServiceContainer = require('./utils.container');
const ResourceManager = require('./service.resource');
const CacheManager = require('./utils.cache');

const container = new ServiceContainer();
container.register('resourceManager', function() {
  return new ResourceManager();
});
container.register('cacheManager', function() {
  return new CacheManager();
});

// In controller.room.js
const ServiceContainer = require('./utils.container');

class RoomController {
  constructor(room, gameController, container) {
    this.room = room;
    this.gameController = gameController;
    this.resourceManager = container.get('resourceManager');
    this.cacheManager = container.get('cacheManager');
  }
}

module.exports = RoomController;
```

### 6.2 Event-System

**Vorschlag:**

```javascript
// utils.events.js (neue Datei)
const Log = require('./lib.log');

class EventBus {
  constructor() {
    this._listeners = new Map();
  }
  
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    const handlers = this._listeners.get(event);
    handlers.push(handler);
  }
  
  emit(event, data) {
    const handlers = this._listeners.get(event);
    if (!handlers) {
      return;
    }
    
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        Log.error(`Error in event handler for ${event}: ${error.message}`, 'EventBus');
      }
    }
  }
  
  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

module.exports = EventBus;

// Verwendung in main.js oder _initGlobal.js
const EventBus = require('./utils.events');
const Log = require('./lib.log');

const eventBus = new EventBus();

eventBus.on('creep.spawned', function(creep) {
  Log.info(`Creep ${creep.name} spawned`, 'Spawn');
});

eventBus.on('room.underAttack', function(room) {
  // Defensive Maßnahmen
});

global.eventBus = eventBus;
```

### 6.3 Strategy Pattern für Behaviors

**Vorschlag:**

```javascript
// behavior.base.js (erweitert)
class BehaviorStrategy {
  constructor(name) {
    this.name = name;
  }
  
  canExecute(creep, rc) {
    return this.when(creep, rc);
  }
  
  isComplete(creep, rc) {
    return this.completed(creep, rc);
  }
  
  execute(creep, rc) {
    return this.work(creep, rc);
  }
  
  // Abstrakte Methoden
  when(creep, rc) { return false; }
  completed(creep, rc) { return true; }
  work(creep, rc) { }
}

module.exports = BehaviorStrategy;

// utils.behaviors.js (erweitert)
class BehaviorRegistry {
  constructor() {
    this._behaviors = new Map();
    this._priorities = new Map();
  }
  
  register(behavior, priority) {
    if (priority === undefined) {
      priority = 100;
    }
    this._behaviors.set(behavior.name, behavior);
    this._priorities.set(behavior.name, priority);
  }
  
  findApplicable(creep, rc, roleConfig) {
    const behaviors = roleConfig.behaviors || [];
    const sorted = behaviors.slice().sort(function(a, b) {
      const prioA = this._priorities.get(a) || 100;
      const prioB = this._priorities.get(b) || 100;
      return prioA - prioB;
    }.bind(this));
    
    for (const behaviorName of sorted) {
      const behavior = this._behaviors.get(behaviorName);
      if (behavior && behavior.canExecute(creep, rc)) {
        return behavior;
      }
    }
    
    return null;
  }
}

module.exports = BehaviorRegistry;
```

---

## 7. TESTBARKEIT VERBESSERN

### 7.1 Unit-Test-freundliche Struktur

**Vorschlag:**

```javascript
// Statt direkter Game-API-Aufrufe
class RoomController {
  constructor(room, gameController, gameApi = Game) {
    this.room = room;
    this.gameController = gameController;
    this.game = gameApi; // Für Tests mockbar
  }
  
  find(type) {
    return this.room.find(type);
  }
}

// Test
const mockGame = {
  time: 1000,
  creeps: {},
  rooms: {}
};

const controller = new RoomController(mockRoom, mockGameController, mockGame);
```

### 7.2 Mock-Framework für Screeps

**Vorschlag:**

```javascript
// test/mocks/ScreepsMock.js
class ScreepsMock {
  static createRoom(name) {
    return {
      name: name,
      controller: { level: 1 },
      find: (type) => [],
      // ... weitere Mock-Properties
    };
  }
  
  static createCreep(name, role) {
    return {
      name: name,
      memory: { role: role },
      store: { getUsedCapacity: () => 0 },
      // ... weitere Mock-Properties
    };
  }
}
```

---

## 8. MIGRATIONSPLAN

### Phase 1: Vorbereitung (Woche 1)
1. ✅ Backup der aktuellen Codebase
2. ✅ Refactoring-Vorschläge dokumentieren (dieses Dokument)
3. ✅ Test-Suite erstellen (falls nicht vorhanden)
4. ✅ Code-Analyse-Tools einrichten

### Phase 2: Strukturelle Reorganisation (Woche 2-3)
1. Neue Ordnerstruktur erstellen
2. Dateien schrittweise verschieben
3. Import-Pfade aktualisieren
4. Tests nach jedem Schritt ausführen

### Phase 3: Code-Modernisierung (Woche 4-6)
1. ControllerRoom.js aufteilen
2. Behavior-System modernisieren
3. Traveler.js modularisieren
4. RoomPlanner.js aufteilen
5. Prototype-Erweiterungen reorganisieren

### Phase 4: Optimierungen (Woche 7-8)
1. Caching-System implementieren
2. Memory-Optimierungen
3. Pathfinding-Verbesserungen
4. CPU-Optimierungen

### Phase 5: Code-Qualität (Woche 9-10)
1. TypeScript-Definitionen erweitern
2. Error-Handling verbessern
3. Logging-System erweitern
4. Dokumentation aktualisieren

### Phase 6: Testing & Stabilisierung (Woche 11-12)
1. Umfassende Tests
2. Performance-Messungen
3. Bug-Fixes
4. Finale Dokumentation

---

## 9. RISIKEN & MITIGATION

### Risiko 1: Breaking Changes
**Mitigation:**
- Schrittweise Migration
- Feature-Flags für neue/alte Implementierung
- Umfassendes Testing

### Risiko 2: Performance-Verschlechterung
**Mitigation:**
- Vorher/Nachher CPU-Messungen
- Profiling während Migration
- Rollback-Plan

### Risiko 3: Memory-Überlauf
**Mitigation:**
- Memory-Monitoring
- Regelmäßige Cleanup-Routinen
- Memory-Limits definieren

---

## 10. ERFOLGSKRITERIEN

- ✅ Code-Qualität: Alle Dateien < 500 Zeilen
- ✅ CPU-Verbrauch: Keine Verschlechterung, idealerweise -10%
- ✅ Memory-Verbrauch: Reduktion um 20%
- ✅ Wartbarkeit: Klare Struktur, gute Dokumentation
- ✅ Testbarkeit: Alle kritischen Komponenten testbar
- ✅ Performance: Keine Regression in Gameplay

---

## 11. NÄCHSTE SCHRITTE

1. **Review dieses Dokuments** - Feedback sammeln
2. **Prioritäten setzen** - Welche Bereiche zuerst?
3. **Proof of Concept** - Kleine Refactoring-Beispiele
4. **Migration starten** - Schrittweise Umsetzung

---

## ANHANG: Code-Beispiele

### Beispiel 1: Modernisierter Behavior (ES2017)

```javascript
// behavior.work.repair.js
const Behavior = require('./behavior.base');
const Log = require('./lib.log');

class RepairBehavior extends Behavior {
  constructor() {
    super('repair');
  }
  
  when(creep, rc) {
    if (creep.store.getUsedCapacity() === 0) {
      return false;
    }
    
    const structures = rc.findStructuresToRepair();
    return structures.length > 0;
  }
  
  completed(creep, rc) {
    const target = creep.getTarget();
    
    if (creep.store.getUsedCapacity() === 0) {
      return true;
    }
    
    if (!target) {
      return true;
    }
    
    return target.hits === target.hitsMax;
  }
  
  work(creep, rc) {
    let target = creep.getTarget();
    
    if (!target) {
      const structures = rc.findStructuresToRepair();
      if (structures.length > 0) {
        target = structures[0];
        creep.target = target.id;
      } else {
        return;
      }
    }
    
    const result = creep.repair(target);
    
    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(target);
    } else if (result !== OK) {
      Log.warn(`Repair failed: ${result}`, 'Repair', {
        creep: creep.name,
        target: target.id
      });
    }
  }
}

module.exports = new RepairBehavior();
```

### Beispiel 2: Modularisierter RoomController (ES2017)

```javascript
// controller.room.js
const CreepManager = require('./controller.room.creeps');
const LogisticsManager = require('./controller.room.logistics');
const CacheManager = require('./utils.cache');
const CONSTANTS = require('./config.constants');

class RoomController {
  constructor(room, gameController) {
    this.room = room;
    this.gameController = gameController;
    
    // Manager initialisieren
    this.creepManager = new CreepManager(this);
    this.logisticsManager = new LogisticsManager(this);
    
    // Services
    this.cache = new CacheManager();
    
    // Caches
    this._findCache = {};
    this._enemiesCache = null;
  }
  
  run() {
    this._resetCaches();
    
    // Kritische Operationen
    this._populate();
    this._commandCreeps();
    
    // Optionale Operationen (nur bei CPU-Verfügbarkeit)
    if (this._hasCpuAvailable()) {
      this.logisticsManager.update();
    }
  }
  
  _resetCaches() {
    this._findCache = {};
    this._enemiesCache = null;
  }
  
  _populate() {
    if (Game.time % CONSTANTS.TICKS.CHECK_POPULATION !== 0) {
      return;
    }
    
    const spawn = this.getIdleSpawn();
    if (!spawn) {
      return;
    }
    
    // Spawn-Logik...
  }
  
  _commandCreeps() {
    this.creepManager.commandCreeps();
  }
  
  _hasCpuAvailable(threshold) {
    if (threshold === undefined) {
      threshold = CONSTANTS.CPU.BUCKET_MEDIUM;
    }
    const remaining = Game.cpu.limit - Game.cpu.getUsed();
    return remaining > 0 && Game.cpu.bucket > threshold;
  }
  
  // Delegation an Manager
  find(type) {
    return this.cache.get(`find_${type}`, function() {
      return this.room.find(type);
    }.bind(this));
  }
  
  getAllCreeps(role) {
    return this.creepManager.getAllCreeps(role);
  }
  
  getCreeps(role, target) {
    return this.creepManager.getCreeps(role, target);
  }
  
  givesResources() {
    return this.logisticsManager.givesResources();
  }
  
  needsResources() {
    return this.logisticsManager.needsResources();
  }
}

module.exports = RoomController;
```

---

**Ende des Dokuments**

Dieses Dokument sollte als Leitfaden für die umfassende Refaktorierung dienen. Jeder Abschnitt kann schrittweise implementiert werden, wobei nach jedem Schritt Tests durchgeführt werden sollten.

