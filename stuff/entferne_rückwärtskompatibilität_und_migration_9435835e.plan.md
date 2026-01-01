---
name: Entferne Rückwärtskompatibilität und Migration
overview: Entfernt alle Rückwärtskompatibilitäts-Code und die Migration-Funktion, sodass nur noch die neue einheitliche Struktur unter Memory.rooms[roomName].structures verwendet wird.
todos: []
---

# Ent

fernen von Rückwärtskompatibilität und Migration

## Ziel

Alle Zugriffe auf die flache Struktur (memory.sources, memory.controller, memory.mineral) entfernen und nur noch die neue einheitliche Struktur unter `Memory.rooms[roomName].structures` verwenden.

## Änderungen

### 1. Migration entfernen

**`src/utils.roomAnalysis.js`**:

- Entferne die gesamte Funktion `migrateRoomMemoryStructure()` (Zeilen ~10-85)

- Entferne den Aufruf `migrateRoomMemoryStructure(room.name);` in `analyzeRoom()` (Zeile ~231)

- Entferne `migrateRoomMemoryStructure` aus dem `module.exports` (Zeile ~612)

### 2. Rückwärtskompatibilität in analyzeRoom() entfernen

**`src/utils.roomAnalysis.js`** - `analyzeRoom()`:

- Entferne die Zuweisung `memory.sources = sources.map(...)` (Zeilen ~269-279) - diese erstellt das Array für Rückwärtskompatibilität

- Entferne die Zuweisung `memory.mineral = Memory.rooms[room.name].structures.minerals[mineralId];` (Zeile ~314) - Kommentar "for backward compatibility"

- Entferne die Zuweisung `memory.controller = Memory.rooms[room.name].structures.controllers[controllerId];` (Zeile ~386) - Kommentar "for backward compatibility"

- Entferne Kommentare, die auf Rückwärtskompatibilität hinweisen

### 3. calculateRoomScore() anpassen

**`src/utils.roomAnalysis.js`** - `calculateRoomScore()`:

- Ersetze `memory.controller` Zugriffe durch Zugriff auf `memory.structures.controllers[controllerId]`

- Zeile ~99: `(memory.controller !== undefined)` → Prüfe auf `memory.structures?.controllers`

- Zeile ~116-117: `memory.controller` → Hole ersten Controller aus `memory.structures.controllers`

- Ersetze `memory.sources` Zugriff (Zeile ~126) durch Zugriff auf `memory.structures.sources`

- Bilde Array aus `Object.keys(memory.structures.sources || {})`

- Ersetze `memory.mineral` Zugriffe (Zeilen ~166, 175) durch Zugriff auf `memory.structures.minerals[mineralId]`

- Hole ersten Mineral aus `memory.structures.minerals`

### 4. logAnalysisSummary() anpassen

**`src/utils.roomAnalysis.js`** - `logAnalysisSummary()`:

- Ersetze `memory.sources` Zugriffe (Zeile ~506) durch Zugriff auf `memory.structures.sources`

- Ersetze `memory.mineral` Zugriffe (Zeile ~511) durch Zugriff auf `memory.structures.minerals`

- Ersetze `memory.controller` Zugriffe (Zeilen ~420-428, 469, 483) durch Zugriff auf `memory.structures.controllers`

### 5. Helper-Funktionen in utils.console.js vereinfachen

**`src/utils.console.js`**:

- `_getControllerMemory()`: Entferne Fallback auf `roomMemory.controller`, nur noch Zugriff auf `roomMemory.structures.controllers`

- `_getSourcesArray()`: Entferne Fallback auf `roomMemory.sources`, nur noch Zugriff auf `roomMemory.structures.sources` (Array aus Objekt-Keys bauen)

- `_getMineralMemory()`: Entferne Fallback auf `roomMemory.mineral`, nur noch Zugriff auf `roomMemory.structures.minerals`

### 6. config.creeps.js bereinigen

**`src/config.creeps.js`**:

- Entferne die Aktualisierung der flachen Struktur (Zeilen ~344-349) - "Also update flat structure for backward compatibility"

- Vereinfache `controllerLevel` Check (Zeilen ~353-364): Entferne Fallback auf `roomMemory.controller`, nur noch Zugriff auf `roomMemory.structures.controllers`

### 7. prototype.room.js bereinigen

**`src/prototype.room.js`**:

- `Room.isRoomClaimed()`: Entferne Fallback auf `roomMemory.controller` (Zeilen ~101), nur noch Zugriff auf `roomMemory.structures.controllers`

- `Room.isRoomValidForClaiming()`: Entferne Fallback auf `roomMemory.controller` (Zeilen ~111-115), nur noch Zugriff auf `roomMemory.structures.controllers`

## Betroffene Dateien

1. `src/utils.roomAnalysis.js` - Migration entfernen, Rückwärtskompatibilität in analyzeRoom(), calculateRoomScore(), logAnalysisSummary()

2. `src/utils.console.js` - Helper-Funktionen vereinfachen

3. `src/config.creeps.js` - Flache Struktur-Updates entfernen, Fallbacks entfernen

4. `src/prototype.room.js` - Fallbacks in Room.isRoomClaimed() und Room.isRoomValidForClaiming() entfernen

## Hinweise

- Nach diesen Änderungen funktioniert der Code nur noch mit der neuen Struktur

- Stelle sicher, dass alle Daten bereits migriert sind, bevor dieser Code ausgeführt wird

- Die flache Struktur (memory.sources, memory.controller, memory.mineral) wird nicht mehr verwendet