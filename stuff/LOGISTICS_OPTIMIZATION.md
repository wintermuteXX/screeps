# Logistiksystem Optimierungsvorschlag

## Analyse des aktuellen Systems

### Stärken:
1. ✅ Prioritätsbasiertes Matching: `need.priority < give.priority` verhindert Verschwendung
2. ✅ Distanzbasierte Sortierung für effiziente Routen
3. ✅ Batching für Ornithopter (Range 2)
4. ✅ Caching von `givesResources()` und `needsResources()`
5. ✅ Resource-Sharing Tracking für Ornithopter

### Verbesserungspotenzial:

#### 1. **CPU-Optimierung - Reduktion von verschachtelten Loops**
- **Problem**: `getTransportOrder()` hat O(n*m) Komplexität (gives × needs)
- **Lösung**: Indexierung nach Resource-Typ für O(n+m) Lookups

#### 2. **Intelligentes Batching für normale Transporter**
- **Problem**: Normale Transporter nehmen nur eine Ressource auf einmal
- **Lösung**: Multi-Resource Batching ähnlich Ornithopter

#### 3. **Dynamische Cache-Invalidierung**
- **Problem**: Cache bleibt für gesamten Tick bestehen, auch wenn Ressourcen sich ändern
- **Lösung**: Cache-Invalidierung bei kritischen Änderungen

#### 4. **Bessere Resource-Sharing Logik**
- **Problem**: Blockierung wenn ein Creep eine Ressource reserviert
- **Lösung**: Partial-Sharing für große Ressourcenmengen

#### 5. **Pathfinding-basierte Distanzberechnung**
- **Problem**: `getRangeTo()` berücksichtigt keine Terrain-Kosten
- **Lösung**: Cached Pathfinding für genauere Distanzschätzung

#### 6. **Kapazitätsoptimierte Zuordnung**
- **Problem**: Kleine Mengen werden großen Creeps zugewiesen (Ineffizienz)
- **Lösung**: Größenmatching zwischen Auftrag und Creep-Kapazität

---

## Vorgeschlagene Optimierungen

### Optimierung 1: Indexiertes Matching (CPU-Effizienz)

```javascript
// Statt: O(n*m) - alle gives mit allen needs vergleichen
for (const give of givesResources) {
  for (const need of needsResources) {
    if (give.resourceType !== need.resourceType) continue;
    // ...
  }
}

// Besser: O(n+m) - indexiert nach Resource-Typ
const needsByResource = new Map();
for (const need of needsResources) {
  if (!needsByResource.has(need.resourceType)) {
    needsByResource.set(need.resourceType, []);
  }
  needsByResource.get(need.resourceType).push(need);
}

for (const give of givesResources) {
  const matchingNeeds = needsByResource.get(give.resourceType) || [];
  for (const need of matchingNeeds) {
    // Nur kompatible Paare werden verglichen
  }
}
```

**Erwarteter Gewinn**: 50-80% CPU-Reduktion bei vielen Ressourcen-Typen

---

### Optimierung 2: Multi-Resource Batching für alle Transporter

**Konzept**: Transporter können mehrere Ressourcen gleichzeitig sammeln, wenn:
- Quellen nahe beieinander sind (Range ≤ 3)
- Gleiche Priorität haben
- Kompatible Needs in der Nähe sind

**Vorteile**:
- Weniger Leerfahrten
- Bessere Kapazitätsauslastung
- Geringere Anzahl benötigter Transporter

**Implementierung**: Ähnlich wie `getTransportOrderOrnithopter()`, aber angepasst für normale Creeps

---

### Optimierung 3: Partial Resource Sharing

**Problem**: Wenn ein Container 5000 Energy hat und 3 Transporter je 1000 brauchen, wird nur einer zugewiesen.

**Lösung**:
```javascript
// Track assigned amounts pro Resource-ID
const assignedAmounts = new Map(); // key: "resourceId_resourceType", value: assignedAmount

// Beim Matching prüfen:
const resourceKey = `${give.id}_${give.resourceType}`;
const assigned = assignedAmounts.get(resourceKey) || 0;
const available = (giveObj.store[give.resourceType] || 0) - assigned;

if (available >= MIN_SHARING_THRESHOLD) {
  // Resource kann geteilt werden
  const takeAmount = Math.min(available, creepCapacity);
  // Update assigned amounts
}
```

**Erwarteter Gewinn**: 30-50% bessere Resource-Auslastung

---

### Optimierung 4: Adaptive Prioritätsgewichtung

**Konzept**: Priorität wird mit Distanz kombiniert für bessere Entscheidungen

**Formel**: `score = priority * PRIORITY_WEIGHT + distance * DISTANCE_WEIGHT`

**Vorteile**:
- Kurze Wege bei gleicher Priorität bevorzugt
- Lange Wege nur bei hoher Priorität
- Flexibler als reine Prioritätssortierung

---

### Optimierung 5: Cache-Invalidierung bei kritischen Änderungen

```javascript
// In _addGivesResource() / _addNeedsResource():
_addGivesResource(entry) {
  // ... existing code ...
  // Invalidate cache if critical change
  if (entry.priority <= CONSTANTS.PRIORITY.TOWER_ENEMY) {
    this.rc._givesResources = null; // Force recalculation
  }
}
```

---

### Optimierung 6: Größenbasierte Zuordnung

**Konzept**: Match Creep-Kapazität mit Auftragsgröße

```javascript
const creepCapacity = creep.store.getCapacity();
const orderAmount = need.amount || give.amount;

// Prefer matching sizes (±30% tolerance)
const sizeMatch = Math.abs(creepCapacity - orderAmount) / Math.max(creepCapacity, orderAmount);
const sizeScore = sizeMatch < 0.3 ? 1.0 : 0.5;

// Include in sorting:
matchingOrders.push({
  give, need,
  priority: need.priority,
  distance: totalDistance,
  sizeScore: sizeScore, // Für bessere Zuordnung
});
```

---

## Implementierungsreihenfolge (nach Priorität)

1. **Indexiertes Matching** (Höchste CPU-Ersparnis, einfach umzusetzen)
2. **Partial Resource Sharing** (Gute Effizienzsteigerung, mittlerer Aufwand)
3. **Multi-Resource Batching für normale Transporter** (Hoher Effizienzgewinn, höherer Aufwand)
4. **Adaptive Prioritätsgewichtung** (Feinabstimmung, niedriger Aufwand)
5. **Größenbasierte Zuordnung** (Optimierung, mittlerer Aufwand)
6. **Cache-Invalidierung** (Feinabstimmung, niedriger Aufwand)

---

## Erwartete Gesamtverbesserungen

- **CPU-Verbrauch**: -40% bis -60% (hauptsächlich durch indexiertes Matching)
- **Transporter-Effizienz**: +50% bis +80% (durch Batching und Sharing)
- **Resource-Auslastung**: +30% bis +50% (durch Partial Sharing)
- **Durchsatz**: +40% bis +60% (durch bessere Zuordnung und Batching)

---

## Risiken und Nebenwirkungen

1. **Komplexität**: Code wird komplexer - mehr Testfälle nötig
2. **Debugging**: Schwerer nachzuvollziehen bei Multi-Resource Batching
3. **Memory**: Mehr Tracking-Daten nötig (assignedAmounts Map)
4. **Edge Cases**: Mehr Sonderfälle zu berücksichtigen (z.B. gleichzeitige Updates)

---

## Empfohlene nächste Schritte

1. ✅ **Phase 1**: Indexiertes Matching implementieren (schneller Gewinn)
2. ✅ **Phase 2**: Partial Resource Sharing hinzufügen (gute Balance)
3. ✅ **Phase 3**: Multi-Resource Batching testen (größter Aufwand, größter Gewinn)
4. ✅ **Phase 4**: Feintuning mit Prioritätsgewichtung und Größenmatching

Soll ich mit der Implementierung beginnen?

