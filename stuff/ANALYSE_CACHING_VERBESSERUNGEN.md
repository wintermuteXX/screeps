# Bot-Analyse: Caching & Funktions-Wiederverwendung

## Zusammenfassung

Dein Bot hat bereits eine gute Grundstruktur mit einem `CacheManager` und Prototyp-Erweiterungen. Es gibt jedoch **erhebliches Verbesserungspotenzial** bei der konsequenten Nutzung von Caching und der Eliminierung von Code-Duplikation.

## 🔴 Kritische Probleme

### 1. Zwei verschiedene Caching-Systeme

**Problem:** Es gibt zwei separate Caching-Mechanismen, die nicht optimal zusammenarbeiten:

- **CacheManager** (`utils.cache.js`): Tick-basiert, wird nur in `ControllerRoom` verwendet
- **Room Prototypes** (`utils.roomPrototypes.js`): Timeout-basiert (~50 Ticks), cached Strukturen

**Impact:** Inkonsistente Cache-Dauer, potenzielle Race Conditions, unnötige Komplexität.

**Empfehlung:** 
- Verwende für **alle** `room.find()` Operationen den `ControllerRoom.find()` Cache
- Integriere die Room Prototype Caches in den `CacheManager`
- Oder vereinheitliche auf einen einzigen Cache-Mechanismus

---

### 2. Viele `room.find()` Aufrufe sind NICHT gecacht

**Betroffene Dateien:**

#### `service.planner.js` - ⚠️ HOHE PRIORITÄT
- Zeile 182: `this.room.find(FIND_SOURCES)` - wird mehrfach aufgerufen
- Zeile 210: `this.room.find(FIND_MINERALS)` - wird mehrfach aufgerufen
- Zeile 363: `this.room.find(FIND_MY_SPAWNS)`
- Zeile 440: `this.room.find(FIND_SOURCES)` - Duplikat!
- Zeile 795: `this.room.find(FIND_SOURCES)` - Duplikat!
- Zeile 993: `this.room.find(FIND_CONSTRUCTION_SITES)`

**Problem:** RoomPlanner hat keinen Zugriff auf `ControllerRoom.cache`, da er direkt mit `room` arbeitet.

**Lösung:** RoomPlanner sollte `roomController` als Parameter erhalten oder einen eigenen Cache bekommen.

#### `utils.roomAnalysis.js` - ⚠️ HOHE PRIORITÄT
- Zeile 172-182: Mehrere `room.find()` Aufrufe
- Zeile 248, 264, 277: Weitere find() Aufrufe
- Zeile 334-373: Viele Struktur-Counts via `room.find()`

**Problem:** `analyzeRoom()` wird nur periodisch aufgerufen, aber trotzdem sollte gecacht werden.

#### `config.creeps.js`
- Zeile 47: `rc.find(FIND_SOURCES)` ✅ (bereits gecacht)
- Zeile 234: `rc.find(FIND_STRUCTURES)` ✅
- Zeile 408: `rc.room.find(FIND_MY_STRUCTURES)` ❌ (direkt auf room, nicht gecacht!)

#### `prototype.structure.js`
- Zeile 352: `this.room.find(FIND_DROPPED_RESOURCES)` - nicht gecacht

#### `utils.console.js`
- Zeile 212: `room.find(FIND_STRUCTURES)` - nicht gecacht

---

### 3. Doppelte Aufrufe von `getEnemys()`

**Problem:** In `controller.tower.js`:
- `_fire()` ruft `getEnemys()` auf (Zeile 15)
- `_repair()` ruft `getEnemys()` erneut auf (Zeile 32)
- Bei mehreren Türmen wird `getEnemys()` mehrfach pro Tick aufgerufen

**Aktuell:** Wird bereits gecacht in `StructuresManager.getEnemys()` ✅

**Optimierung:** Cache-Aufruf ist bereits vorhanden, aber die Methode wird trotzdem mehrfach aufgerufen. Das ist OK, da sie gecacht ist.

---

### 4. Viele `Game.getObjectById()` Aufrufe (43 Instanzen)

**Problem:** Direkte Aufrufe ohne zentrale Cache-Strategie.

**Betroffene Bereiche:**
- `prototype.structure.js`: Container-Lookups
- `prototype.room.js`: Mineral-Lookups  
- `utils.roomPrototypes.js`: Struktur-Lookups (bereits optimiert)
- `controller.room.js`: Controller-Container-Lookups

**Empfehlung:** 
- Erstelle eine zentrale `getObjectByIdCached()` Funktion
- Oder nutze die bereits vorhandenen Memory-Strukturen konsistenter

---

## 🟡 Mittlere Probleme

### 5. Wiederholte Filter-Patterns

**Problem:** Ähnliche Filter-Logik wird an mehreren Stellen wiederholt:

```javascript
// Pattern 1: FIND_MY_STRUCTURES mit structureType Filter
room.find(FIND_MY_STRUCTURES, {
  filter: { structureType: STRUCTURE_LAB }
})

// Pattern 2: Container-Zugriff über source.container
source.container // wird mehrfach verwendet

// Pattern 3: Strukturen mit freier Kapazität finden
structures.filter(s => s.store.getFreeCapacity(resource) > threshold)
```

**Empfehlung:** Erstelle Helper-Funktionen:

```javascript
// In utils.roomPrototypes.js oder neues utils.structures.js
Room.prototype.findStructuresByType = function(structureType, myOnly = true) {
  const findType = myOnly ? FIND_MY_STRUCTURES : FIND_STRUCTURES;
  return this.find(findType, {
    filter: { structureType: structureType }
  });
};

Room.prototype.getStructuresWithCapacity = function(resource, minCapacity = 0) {
  return this.find(FIND_STRUCTURES, {
    filter: (s) => s.store && s.store.getFreeCapacity(resource) > minCapacity
  });
};
```

---

### 6. Inconsistent Cache Keys

**Problem:** Cache-Keys sind nicht standardisiert:

- `"find_${type}"` - für find() Operationen
- `"enemies"` - ohne Raum-Präfix
- `"droppedResourcesAmount"` - ohne Raum-Präfix
- `"sourcesNotEmpty"` - ohne Raum-Präfix

**Empfehlung:** Verwende konsistente Naming-Convention:

```javascript
// Format: "scope_key_identifier"
cache.get(`room_${room.name}_find_${type}`)
cache.get(`room_${room.name}_enemies`)
cache.get(`creep_${creep.id}_harvestPower`)
```

**Aber:** Da `ControllerRoom.cache` bereits pro Raum instanziiert wird, sind Raum-Präfixe nicht nötig. Aktuelle Keys sind OK.

---

### 7. RoomPlanner hat keinen Zugriff auf Cache

**Problem:** `RoomPlanner` arbeitet direkt mit `room`, nicht mit `roomController`:

```javascript
function RoomPlanner(room) {
  this.room = room;  // Direktes Room-Objekt
  // Kein Zugriff auf roomController.cache!
}
```

**Lösungsoptionen:**

**Option A:** RoomPlanner erhält roomController als Parameter
```javascript
function RoomPlanner(roomController) {
  this.rc = roomController;
  this.room = roomController.room;
  this.cache = roomController.cache; // Jetzt verfügbar!
}
```

**Option B:** RoomPlanner bekommt eigenen Cache
```javascript
const CacheManager = require("./utils.cache");
function RoomPlanner(room) {
  this.room = room;
  this.cache = new CacheManager();
}
```

**Option C:** Nutze die bestehenden Room Prototype Caches (bereits vorhanden!)

---

### 8. Verwendung von `rc.find()` vs `room.find()`

**Gut:** Viele Stellen nutzen bereits `rc.find()`:
- `controller.room.creeps.js` ✅
- `controller.room.logistics.js` ✅ (meistens)
- `config.creeps.js` ✅ (meistens)

**Schlecht:** Einige Stellen nutzen noch `room.find()` direkt:
- `service.planner.js` ❌
- `utils.roomAnalysis.js` ❌
- `prototype.structure.js` ❌
- `prototype.room.js` ❌ (aber das ist OK, da Prototype-Level)

**Empfehlung:** Wenn möglich, nutze `rc.find()` statt `room.find()` direkt.

---

## 🟢 Positive Aspekte

### ✅ Gut implementiert:

1. **CacheManager-Klasse:** Gut strukturiert mit automatischem Tick-Reset
2. **ControllerRoom.find():** Bietet gecachte find() Operationen
3. **CreepManager.getAllCreeps():** Effizientes Caching per Tick mit Role-Index
4. **StructuresManager.getEnemys():** Nutzt Cache korrekt
5. **Room Prototype Caches:** Gut für Struktur-Zugriffe implementiert

---

## 📋 Konkrete Verbesserungsvorschläge

### Priorität 1: RoomPlanner Caching

**Datei:** `service.planner.js`

**Änderung:** Füge Cache-Support hinzu

```javascript
// Am Anfang der Datei
const CacheManager = require("./utils.cache");

// In RoomPlanner Constructor
function RoomPlanner(room) {
  this.room = room;
  this.roomName = room.name;
  this.memory = this._initMemory();
  this._structureCounts = null;
  this.cache = new CacheManager(); // NEU
}

// Dann in Methoden:
RoomPlanner.prototype._isTooCloseToSource = function (x, y) {
  const sources = this.cache.get('sources', () => {
    return this.room.find(FIND_SOURCES);
  });
  // ... rest of code
};
```

---

### Priorität 2: analyzeRoom() Caching

**Datei:** `utils.roomAnalysis.js`

**Änderung:** Füge lokalen Cache hinzu oder nutze Room Prototype Caches

```javascript
// Option A: Lokaler Cache pro Aufruf
function analyzeRoom(room, fullAnalysis = false) {
  const cache = new CacheManager(); // Oder: room._analysisCache
  
  // Verwende cache.get() für alle find() Aufrufe
  const sources = cache.get('sources', () => room.find(FIND_SOURCES));
  // ...
}

// Option B: Nutze Room Prototype Getter (bereits vorhanden!)
// Statt: room.find(FIND_SOURCES)
// Nutze: room.sources (bereits gecacht!)
```

**Hinweis:** Viele Strukturen sind bereits über Room Prototypes gecacht:
- `room.sources` (falls implementiert)
- `room.labs`
- `room.towers`
- `room.extensions`
- etc.

---

### Priorität 3: Helper-Funktionen für wiederholte Patterns

**Neue Datei:** `utils.structures.js`

```javascript
/**
 * Helper functions for structure operations
 */

/**
 * Find structures by type with caching
 * @param {Room|ControllerRoom} roomOrRc - Room or RoomController
 * @param {string} structureType - Structure type constant
 * @param {boolean} myOnly - Only find own structures
 * @returns {Structure[]}
 */
function findStructuresByType(roomOrRc, structureType, myOnly = true) {
  const room = roomOrRc.room || roomOrRc;
  const cache = roomOrRc.cache || null;
  
  const findType = myOnly ? FIND_MY_STRUCTURES : FIND_STRUCTURES;
  
  if (cache) {
    return cache.get(`find_${findType}_${structureType}`, () => {
      return room.find(findType, {
        filter: { structureType: structureType }
      });
    });
  } else {
    return room.find(findType, {
      filter: { structureType: structureType }
    });
  }
}

/**
 * Get structures with free capacity for a resource
 */
function getStructuresWithCapacity(roomOrRc, resource, minCapacity = 0) {
  const room = roomOrRc.room || roomOrRc;
  const cache = roomOrRc.cache || null;
  
  const key = `structuresWithCapacity_${resource}_${minCapacity}`;
  
  if (cache) {
    return cache.get(key, () => {
      return room.find(FIND_STRUCTURES, {
        filter: (s) => s.store && s.store.getFreeCapacity(resource) > minCapacity
      });
    });
  } else {
    return room.find(FIND_STRUCTURES, {
      filter: (s) => s.store && s.store.getFreeCapacity(resource) > minCapacity
    });
  }
}

module.exports = {
  findStructuresByType,
  getStructuresWithCapacity,
};
```

---

### Priorität 4: Konsolidiere Caching-Strategien

**Option:** Nutze Room Prototypes statt direkter find() Aufrufe wo möglich

**Beispiel:**
```javascript
// Statt:
const labs = room.find(FIND_MY_STRUCTURES, {
  filter: { structureType: STRUCTURE_LAB }
});

// Nutze:
const labs = room.labs; // Bereits gecacht!
```

**Wichtig:** Prüfe, ob alle benötigten Strukturtypen bereits als Prototype-Getter vorhanden sind.

---

## 🔧 Code-Beispiele für Refactoring

### Beispiel 1: service.planner.js optimieren

**Vorher:**
```javascript
RoomPlanner.prototype._isTooCloseToSource = function (x, y) {
  const sources = this.room.find(FIND_SOURCES); // Nicht gecacht
  // ...
};
```

**Nachher:**
```javascript
RoomPlanner.prototype._isTooCloseToSource = function (x, y) {
  const sources = this.cache.get('sources', () => {
    return this.room.find(FIND_SOURCES);
  });
  // ...
};
```

---

### Beispiel 2: config.creeps.js korrigieren

**Vorher:**
```javascript
const observers = rc.room.find(FIND_MY_STRUCTURES, { // Direkt, nicht gecacht
  filter: { structureType: STRUCTURE_OBSERVER }
});
```

**Nachher:**
```javascript
// Option A: Nutze rc.find() mit Filter
const observers = rc.find(FIND_MY_STRUCTURES).filter(s => 
  s.structureType === STRUCTURE_OBSERVER
);

// Option B: Nutze Room Prototype (falls vorhanden)
const observers = rc.room.observers || [];
```

---

### Beispiel 3: prototype.structure.js

**Vorher:**
```javascript
const dropped = this.room.find(FIND_DROPPED_RESOURCES, {
  // ...
});
```

**Nachher:**
```javascript
// Problem: Prototype-Level hat keinen Zugriff auf ControllerRoom.cache
// Lösung: Nutze Room Prototype Cache oder füge eigenen Cache hinzu

// Option A: Nutze Room Prototype (falls vorhanden)
// const dropped = this.room.droppedResources; // Müsste implementiert werden

// Option B: Füge Cache auf Room-Level hinzu
if (!this.room._structureCache) {
  this.room._structureCache = new CacheManager();
}
const dropped = this.room._structureCache.get('droppedResources', () => {
  return this.room.find(FIND_DROPPED_RESOURCES, {
    // ...
  });
});
```

---

## 📊 Erwartete CPU-Einsparungen

**Schätzungen basierend auf typischem Screeps-Bot-Verhalten:**

1. **RoomPlanner Caching:** ~0.5-1.0 CPU pro Tick (bei mehreren Räumen)
2. **analyzeRoom() Caching:** ~0.2-0.5 CPU (seltener Aufruf, aber teuer)
3. **Helper-Funktionen:** ~0.1-0.3 CPU (durch weniger Code-Duplikation)
4. **Game.getObjectById() Caching:** ~0.1-0.2 CPU

**Gesamt:** ~1-2 CPU pro Tick Einsparung (bei ~20 CPU Limit = 5-10% Verbesserung)

---

## ✅ Checkliste für Refactoring

- [ ] RoomPlanner Cache hinzufügen
- [ ] analyzeRoom() Cache hinzufügen
- [ ] Alle `rc.room.find()` → `rc.find()` umstellen wo möglich
- [ ] Helper-Funktionen für wiederholte Patterns erstellen
- [ ] Game.getObjectById() Caching evaluieren
- [ ] Konsistente Cache-Key-Namen prüfen
- [ ] Room Prototype Getter wo möglich nutzen statt find()
- [ ] Code-Duplikation in Struktur-Filtern eliminieren

---

## 📝 Weitere Optimierungen (Optional)

1. **Lazy Loading:** Behaviors werden bereits lazy geladen ✅
2. **Memory-Hacks:** Bereits implementiert via `lib.memhack.js` ✅
3. **Traveler Path Caching:** Bereits implementiert ✅
4. **Creep Body Calculations:** Könnte gecacht werden, aber vermutlich nicht nötig

---

## 🎯 Fazit

Dein Bot hat eine **solide Grundstruktur** mit gutem Caching für kritische Operationen. Die Hauptverbesserungen sind:

1. **Konsistenz:** Nutze `rc.find()` überall wo möglich
2. **RoomPlanner:** Füge Cache-Support hinzu
3. **Code-Reuse:** Eliminiere wiederholte Filter-Patterns
4. **Dokumentation:** Die CacheManager-Dokumentation ist sehr gut! ✅

Die größten CPU-Einsparungen ergeben sich aus dem Caching in `RoomPlanner` und `analyzeRoom()`.
