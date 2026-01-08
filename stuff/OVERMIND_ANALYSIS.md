# Overmind Analyse & Verbesserungsvorschläge für deinen Bot

## Zusammenfassung

Diese Analyse vergleicht deinen aktuellen Bot mit Overmind (https://github.com/bencbartlett/Overmind) und identifiziert konkrete Verbesserungsmöglichkeiten.

## Architektur-Vergleich

### Dein Bot (Aktuell)
- **Controller-basiert**: ControllerGame → ControllerRoom → Manager (Creeps, Logistics, Structures)
- **Behavior-System**: Creeps haben Behaviors mit `when()`, `work()`, `completed()`
- **Direkte Spawn-Logik**: `canBuild()` Funktionen in `config.creeps.js`
- **Logistics Manager**: Prioritätsbasiertes Matching von `givesResources` und `needsResources`

### Overmind (Referenz)
- **Directive-basiert**: Tasks werden als "Directives" erstellt, die von "Overlords" abgearbeitet werden
- **Event-driven**: Direktiven werden erstellt, wenn Bedarf entsteht (z.B. "Harvest", "Build", "Upgrade")
- **Zentralisierte Spawn-Logik**: Overlords bestimmen, welche Creeps gebaut werden müssen
- **Bessere Task-Priorisierung**: Direktiven haben explizite Prioritäten und Abhängigkeiten

---

## Konkrete Verbesserungsvorschläge

### 1. Directive-basiertes Task-Management System

**Problem**: Aktuell werden Tasks implizit durch Behaviors bestimmt. Es gibt keine zentrale Stelle, die alle anstehenden Tasks verwaltet.

**Lösung**: Implementiere ein Directive-System ähnlich Overmind:

```javascript
// service.directives.js
class DirectiveManager {
  constructor() {
    this.directives = new Map(); // directiveId -> directive
  }

  // Erstelle eine neue Directive
  createDirective(type, target, priority = 50, data = {}) {
    const directive = {
      id: `${type}_${target.id}_${Game.time}`,
      type, // 'harvest', 'build', 'upgrade', 'repair', etc.
      target: target.id,
      priority,
      data,
      assigned: null, // creep ID
      createdAt: Game.time,
    };
    this.directives.set(directive.id, directive);
    return directive;
  }

  // Finde passende Directive für einen Creep
  findDirectiveForCreep(creep, role) {
    const available = Array.from(this.directives.values())
      .filter(d => !d.assigned && this.isDirectiveValid(d))
      .filter(d => this.canCreepHandleDirective(creep, d))
      .sort((a, b) => a.priority - b.priority);
    
    return available[0] || null;
  }

  // Cleanup abgeschlossener Direktiven
  cleanup() {
    for (const [id, directive] of this.directives) {
      if (this.isDirectiveComplete(directive)) {
        this.directives.delete(id);
      }
    }
  }
}
```

**Vorteile**:
- Zentrale Task-Verwaltung
- Bessere Priorisierung
- Einfacheres Debugging (siehe alle Tasks)
- Creeps können Tasks "claimen" (verhindert Doppelarbeit)

---

### 2. Verbesserte Creep-Spawn-Logik mit "Need-based Spawning"

**Problem**: Aktuell wird `canBuild()` für jede Rolle zyklisch geprüft. Es gibt keine globale Übersicht über den tatsächlichen Bedarf.

**Lösung**: Implementiere "Need-based Spawning" wie in Overmind:

```javascript
// controller.spawn.js - Erweitere die Spawn-Logik
class SpawnManager {
  calculateSpawnNeeds(rc) {
    const needs = [];
    
    // Analysiere aktuelle Situation
    const constructionSites = rc.find(FIND_CONSTRUCTION_SITES).length;
    const structuresToRepair = rc.findStructuresToRepair().length;
    const controllerEnergy = rc.room.controller ? 
      rc.room.controller.ticksToDowngrade : Infinity;
    
    // Berechne Bedarf basierend auf Situation
    if (constructionSites > 0) {
      const builders = rc.getAllCreeps("builder").length;
      const needed = Math.ceil(constructionSites / 5); // 1 Builder pro 5 Sites
      if (builders < needed) {
        needs.push({ role: 'builder', priority: 20, count: needed - builders });
      }
    }
    
    if (structuresToRepair > 0 && rc.getLevel() >= 4) {
      const constructors = rc.getAllCreeps("constructor").length;
      if (constructors < 1) {
        needs.push({ role: 'constructor', priority: 30, count: 1 });
      }
    }
    
    // Controller-Upgrade-Bedarf
    if (controllerEnergy < 5000) {
      const upgraders = rc.getAllCreeps("upgrader").length;
      const needed = controllerEnergy < 1000 ? 3 : 2;
      if (upgraders < needed) {
        needs.push({ role: 'upgrader', priority: 10, count: needed - upgraders });
      }
    }
    
    // ... weitere Bedarfsanalysen
    
    return needs.sort((a, b) => a.priority - b.priority);
  }
}
```

**Vorteile**:
- Reagiert dynamisch auf aktuelle Situation
- Verhindert Überproduktion
- Bessere Ressourcenallokation

---

### 3. Verbesserte Pathfinding-Strategie

**Problem**: Aktuell wird `travelTo()` verwendet, aber es gibt keine zentrale Pathfinding-Optimierung.

**Lösung**: Implementiere ein zentrales Pathfinding-System:

```javascript
// service.pathfinding.js
class PathfindingManager {
  constructor() {
    this.pathCache = new Map(); // roomName -> pathCache
  }

  // Zentralisierte Pathfinding-Logik mit Caching
  findPath(creep, target, options = {}) {
    const cacheKey = `${creep.pos}_${target.pos}_${JSON.stringify(options)}`;
    
    // Nutze Path-Cache wenn möglich
    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey);
    }
    
    // Finde optimalen Pfad
    const path = PathFinder.search(
      creep.pos,
      { pos: target.pos, range: options.range || 1 },
      {
        roomCallback: this.getRoomCallback(creep.room.name),
        maxRooms: options.maxRooms || 1,
      }
    );
    
    // Cache für kurze Zeit
    this.pathCache.set(cacheKey, path);
    return path;
  }

  // Room-Callback für PathFinder (berücksichtigt Strukturen, Feinde, etc.)
  getRoomCallback(roomName) {
    return (roomName) => {
      const room = Game.rooms[roomName];
      if (!room) return false;
      
      const costs = new PathFinder.CostMatrix();
      
      // Erhöhe Kosten für feindliche Bereiche
      room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
        costs.set(creep.pos.x, creep.pos.y, 255);
      });
      
      // Erhöhe Kosten für Strukturen (aber nicht blockieren)
      room.find(FIND_STRUCTURES).forEach(struct => {
        if (struct.structureType !== STRUCTURE_ROAD && 
            struct.structureType !== STRUCTURE_CONTAINER) {
          costs.set(struct.pos.x, struct.pos.y, 10);
        }
      });
      
      return costs;
    };
  }
}
```

**Vorteile**:
- Zentralisierte Pfadfindung
- Besseres Caching
- Berücksichtigt mehr Faktoren (Feinde, Strukturen)

---

### 4. Verbesserte Resource-Management mit "Resource Requests"

**Problem**: Aktuell werden `givesResources` und `needsResources` jedes Tick neu berechnet. Es gibt keine persistente "Request"-Struktur.

**Lösung**: Implementiere Resource Requests ähnlich Overmind:

```javascript
// service.resourceRequests.js
class ResourceRequestManager {
  constructor() {
    this.requests = new Map(); // requestId -> request
  }

  // Erstelle einen Resource Request
  createRequest(target, resourceType, amount, priority = 50) {
    const request = {
      id: `req_${target.id}_${resourceType}_${Game.time}`,
      target: target.id,
      resourceType,
      amount,
      priority,
      fulfilled: 0,
      assigned: new Set(), // creep IDs die diesen Request bearbeiten
      createdAt: Game.time,
    };
    
    this.requests.set(request.id, request);
    return request;
  }

  // Finde beste Request für einen Creep
  findBestRequest(creep, resourceType = null) {
    const available = Array.from(this.requests.values())
      .filter(req => {
        if (resourceType && req.resourceType !== resourceType) return false;
        if (req.fulfilled >= req.amount) return false;
        if (req.assigned.has(creep.id)) return false;
        return true;
      })
      .sort((a, b) => {
        // Sortiere nach Priorität, dann nach Entfernung
        if (a.priority !== b.priority) return a.priority - b.priority;
        const targetA = Game.getObjectById(a.target);
        const targetB = Game.getObjectById(b.target);
        if (!targetA || !targetB) return 0;
        const distA = creep.pos.getRangeTo(targetA);
        const distB = creep.pos.getRangeTo(targetB);
        return distA - distB;
      });
    
    return available[0] || null;
  }

  // Markiere Request als zugewiesen
  assignRequest(creep, request) {
    request.assigned.add(creep.id);
  }

  // Update Request-Status
  updateRequest(request, fulfilled) {
    request.fulfilled = fulfilled;
    if (request.fulfilled >= request.amount) {
      this.requests.delete(request.id);
    }
  }
}
```

**Vorteile**:
- Persistente Resource-Requests
- Verhindert Doppelarbeit (mehrere Creeps für denselben Request)
- Bessere Nachverfolgung des Fortschritts

---

### 5. CPU-Optimierung: Tick-basierte Task-Verteilung

**Problem**: Alle Creeps werden jeden Tick verarbeitet, auch wenn sie nichts zu tun haben.

**Lösung**: Implementiere Tick-basierte Verteilung:

```javascript
// controller.creep.js - Erweitere die run() Methode
class ControllerCreep {
  run(creep) {
    // Skip creeps die gerade spawnen
    if (creep.spawning) return;
    
    // Skip creeps die gerade renewen (nur alle N Ticks prüfen)
    if (creep.ticksToLive && creep.ticksToLive > 1000) {
      if (Game.time % 10 !== 0) return; // Nur alle 10 Ticks prüfen
    }
    
    // Skip creeps die gerade reisen (nur alle N Ticks prüfen)
    if (creep.memory.traveling && Game.time % 5 !== 0) {
      creep.travelTo(creep.memory.target);
      return;
    }
    
    // Normale Verarbeitung
    const config = getCreepConfig(creep.role);
    if (config !== null) {
      // ... bestehende Logik
    }
  }
}
```

**Vorteile**:
- Reduziert CPU-Verbrauch
- Creeps werden nur verarbeitet wenn nötig

---

### 6. Verbesserte Room-Analyse und Planning

**Problem**: Room-Planner läuft nur periodisch. Es gibt keine kontinuierliche Analyse der Room-Situation.

**Lösung**: Implementiere kontinuierliche Room-Analyse:

```javascript
// service.roomAnalysis.js - Erweitere die Analyse
class RoomAnalysis {
  analyzeRoom(room) {
    const analysis = {
      energy: this.analyzeEnergy(room),
      structures: this.analyzeStructures(room),
      threats: this.analyzeThreats(room),
      opportunities: this.analyzeOpportunities(room),
    };
    
    // Speichere Analyse in Memory
    if (!Memory.rooms[room.name]) Memory.rooms[room.name] = {};
    Memory.rooms[room.name].analysis = analysis;
    Memory.rooms[room.name].lastAnalysis = Game.time;
    
    return analysis;
  }

  analyzeEnergy(room) {
    return {
      available: room.energyAvailable,
      capacity: room.energyCapacityAvailable,
      sources: room.find(FIND_SOURCES).length,
      storage: room.storage ? room.storage.store[RESOURCE_ENERGY] : 0,
      terminal: room.terminal ? room.terminal.store[RESOURCE_ENERGY] : 0,
    };
  }

  analyzeThreats(room) {
    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    const structures = room.find(FIND_HOSTILE_STRUCTURES);
    
    return {
      creeps: hostiles.length,
      structures: structures.length,
      dangerLevel: hostiles.length > 0 ? 'high' : structures.length > 0 ? 'medium' : 'low',
    };
  }

  analyzeOpportunities(room) {
    const opportunities = [];
    
    // Unclaimed sources
    const sources = room.find(FIND_SOURCES);
    sources.forEach(source => {
      if (!source.memory.claimed) {
        opportunities.push({ type: 'source', target: source.id, priority: 50 });
      }
    });
    
    // Construction sites
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    if (sites.length > 0) {
      opportunities.push({ type: 'build', count: sites.length, priority: 30 });
    }
    
    return opportunities;
  }
}
```

**Vorteile**:
- Kontinuierliche Situationsanalyse
- Bessere Entscheidungsgrundlage
- Proaktive Reaktion auf Bedrohungen

---

### 7. Verbesserte Behavior-Transition-Logik

**Problem**: Behaviors werden sequenziell geprüft. Es gibt keine "Interrupt"-Mechanismus für wichtige Tasks.

**Lösung**: Implementiere Behavior-Prioritäten und Interrupts:

```javascript
// behavior.base.js - Erweitere die Base-Klasse
class Behavior {
  constructor(name, priority = 50) {
    this.name = name;
    this.priority = priority; // Niedrigere Zahl = höhere Priorität
    this.interruptible = true; // Kann von höherer Priorität unterbrochen werden
  }

  // Neue Methode: Kann dieses Behavior andere unterbrechen?
  canInterrupt(otherBehavior) {
    if (!otherBehavior.interruptible) return false;
    return this.priority < otherBehavior.priority;
  }
}

// controller.creep.js - Erweitere findBehavior()
findBehavior(config, creep) {
  const { behaviors } = config;
  
  // Sortiere Behaviors nach Priorität
  const sortedBehaviors = behaviors
    .map(name => global.getBehavior(name))
    .filter(b => b !== null)
    .sort((a, b) => a.priority - b.priority);
  
  // Prüfe ob aktuelles Behavior unterbrochen werden sollte
  const currentBehavior = global.getBehavior(creep.behavior);
  if (currentBehavior) {
    for (const b of sortedBehaviors) {
      if (b.when(creep, this.ControllerRoom)) {
        if (b.canInterrupt(currentBehavior)) {
          return b; // Unterbreche aktuelles Behavior
        }
      }
    }
  }
  
  // Normale Behavior-Suche
  for (const b of sortedBehaviors) {
    if (b.when(creep, this.ControllerRoom)) {
      return b;
    }
  }
  
  return null;
}
```

**Vorteile**:
- Wichtige Tasks können laufende Tasks unterbrechen
- Flexiblere Behavior-Logik
- Bessere Reaktion auf Notfälle

---

## Implementierungs-Priorität

### Phase 1 (Sofort umsetzbar):
1. ✅ **CPU-Optimierung**: Tick-basierte Task-Verteilung
2. ✅ **Verbesserte Room-Analyse**: Kontinuierliche Situationsanalyse
3. ✅ **Behavior-Prioritäten**: Interrupt-Mechanismus

### Phase 2 (Mittelfristig):
4. ✅ **Directive-System**: Task-Management
5. ✅ **Need-based Spawning**: Verbesserte Spawn-Logik
6. ✅ **Resource Requests**: Verbessertes Resource-Management

### Phase 3 (Langfristig):
7. ✅ **Pathfinding-Optimierung**: Zentrales Pathfinding-System

---

## Weitere Overmind-Patterns die du übernehmen könntest

### 1. **Zerg-Themed Naming**
Overmind verwendet Zerg-Namen (Overlord, Overseer, etc.). Du könntest Dune-Themen beibehalten, aber die Struktur ähnlich gestalten.

### 2. **Assimilator (Multi-Player Koordination)**
Overmind hat ein System für mehrere Spieler. Falls du mehrere Accounts hast, könntest du ähnliches implementieren.

### 3. **Bessere Visualisierung**
Overmind hat umfangreiche Visualisierungen für Debugging. Du könntest ähnliche Tools hinzufügen.

### 4. **Automatische Expansion**
Overmind expandiert automatisch basierend auf Ressourcen und Bedrohungen. Du könntest ähnliche Logik implementieren.

---

## Fazit

Dein Bot hat bereits eine solide Architektur mit:
- ✅ Gutem Behavior-System
- ✅ Effizientem Logistics-Manager
- ✅ CPU-Optimierungen (MemHack, Cache)
- ✅ Room-Planner

Die größten Verbesserungen würden kommen von:
1. **Directive-basiertem Task-Management** (bessere Übersicht und Priorisierung)
2. **Need-based Spawning** (dynamischere Creep-Produktion)
3. **Verbesserter CPU-Optimierung** (Tick-basierte Verteilung)

Diese Änderungen würden deinen Bot deutlich effizienter und wartbarer machen, ähnlich wie Overmind.
