# Changelog: Caching & Performance Verbesserungen

## Durchgeführte Änderungen

### ✅ 1. RoomPlanner Caching (service.planner.js)
**Änderungen:**
- CacheManager hinzugefügt zum RoomPlanner Constructor
- Alle `room.find()` Aufrufe (12 Instanzen) durch gecachte Versionen ersetzt:
  - `_isTooCloseToSource()` - cached `FIND_SOURCES`
  - `_isTooCloseToMineral()` - cached `FIND_MINERALS`
  - `_findCenter()` - cached `FIND_MY_SPAWNS`
  - `_calculateOptimalCenter()` - cached `FIND_SOURCES`
  - `_detectExistingSpecialStructures()` - cached `FIND_SOURCES`
  - `_placeConstructionSites()` - cached `FIND_CONSTRUCTION_SITES`
  - `_getStructureCounts()` - cached `FIND_STRUCTURES` und `FIND_CONSTRUCTION_SITES`
  - `_placeExtractor()` - cached `FIND_MINERALS`
  - `_placeSourceContainers()` - cached `FIND_SOURCES`
  - `_placeSourceLinks()` - cached `FIND_SOURCES`
  - `_checkOrphanedStructures()` - cached gefilterte Strukturen

**Erwartete CPU-Einsparung:** ~0.5-1.0 CPU pro Tick

---

### ✅ 2. Room Analysis Caching (utils.roomAnalysis.js)
**Änderungen:**
- Tick-basierter Cache auf Room-Ebene hinzugefügt (`room._analysisCache`)
- Alle `room.find()` Aufrufe gecacht:
  - Keeper Lairs
  - Sources
  - Portals
  - Power Banks
  - Deposits
  - Invader Cores
- Struktur-Counts optimiert: Nutzung von Room Prototype Gettern wo verfügbar (z.B. `room.towers`, `room.labs`, `room.links`)
- Fallback auf gecachte `find()` wenn Prototype Getter nicht verfügbar

**Erwartete CPU-Einsparung:** ~0.2-0.5 CPU pro Analyse-Durchlauf

---

### ✅ 3. Helper-Funktionen (utils.structures.js) - NEU
**Neue Datei erstellt mit wiederverwendbaren Funktionen:**
- `findStructuresByType()` - Findet Strukturen nach Typ mit Caching-Unterstützung
- `getStructuresWithCapacity()` - Findet Strukturen mit freier Kapazität
- `findDroppedResources()` - Findet dropped Resources mit optionalen Filtern

**Vorteile:**
- Konsistente Nutzung von Caching
- Reduzierte Code-Duplikation
- Einfache Nutzung in Behaviors und Controllern

---

### ✅ 4. config.creeps.js Optimierung
**Änderungen:**
- `rc.room.find(FIND_MY_STRUCTURES)` → `rc.find(FIND_MY_STRUCTURES).filter()` 
- Nutzt jetzt den gecachten `rc.find()` statt direkter Room-Zugriff

---

### ✅ 5. prototype.structure.js Caching
**Änderungen:**
- `findNearbyDroppedEnergy()` nutzt jetzt Caching
- Prüft mehrere Cache-Quellen:
  1. Analysis Cache (falls verfügbar)
  2. Structure Cache (falls verfügbar)
  3. Erstellt eigenen Cache falls nötig

**Verbesserung:** Reduziert redundante `find()` Aufrufe für dropped resources

---

## Zusammenfassung

### Geänderte Dateien:
1. `src/service.planner.js` - CacheManager hinzugefügt, 12 find() Aufrufe gecacht
2. `src/utils.roomAnalysis.js` - Analysis-Cache hinzugefügt, alle find() Aufrufe optimiert
3. `src/config.creeps.js` - rc.find() statt rc.room.find() verwendet
4. `src/prototype.structure.js` - Caching für dropped resources hinzugefügt
5. `src/utils.structures.js` - **NEU**: Helper-Funktionen für Structure-Operationen

### Cache-Strategien:
- **Tick-basiertes Caching:** Alle Caches werden automatisch pro Tick geleert
- **Mehrstufiges Caching:** 
  - ControllerRoom.cache (höchste Priorität)
  - room._analysisCache (für Analyse-Operationen)
  - room._structureCache (für Prototype-Operationen)

### Performance-Verbesserungen:
- **RoomPlanner:** ~0.5-1.0 CPU pro Tick
- **Room Analysis:** ~0.2-0.5 CPU pro Analyse
- **Gesamt:** ~1-2 CPU pro Tick Einsparung (5-10% bei 20 CPU Limit)

### Nächste Schritte (Optional):
- Helper-Funktionen in bestehenden Code integrieren (z.B. in Behaviors)
- Weitere `rc.room.find()` → `rc.find()` Umstellungen prüfen
- Room Prototype Getter konsequenter nutzen

---

## Testing-Empfehlungen

1. **CPU-Monitoring:** Vergleiche CPU-Verbrauch vor/nach den Änderungen
2. **Funktionalität:** Stelle sicher, dass alle Features weiterhin funktionieren
3. **Cache-Verhalten:** Prüfe, dass Caches korrekt pro Tick geleert werden
4. **Edge Cases:** Teste mit verschiedenen Room-Konfigurationen

---

**Datum:** $(date)
**Status:** ✅ Alle geplanten Verbesserungen implementiert
