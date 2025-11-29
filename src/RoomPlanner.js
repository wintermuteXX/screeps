/**
 * RoomPlanner - Automatische Raumplanung und Gebäudeplatzierung
 * 
 * Erstellt ein optimiertes Layout für jeden Raum basierend auf:
 * - Spawn-Position als Zentrum
 * - RCL-Level des Raums (nur verfügbare Strukturen werden gebaut)
 * - Terrain-Analyse (vermeidet Wände)
 * 
 * Layout-Stil: Kompaktes "Bunker"-Design für effiziente Verteidigung
 */

const CONSTANTS = require("constants");

/**
 * Struktur-Limits pro RCL (aus Screeps API)
 * Diese werden verwendet um zu prüfen ob eine Struktur gebaut werden kann
 */
const CONTROLLER_STRUCTURES = {
  [STRUCTURE_SPAWN]: { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 3 },
  [STRUCTURE_EXTENSION]: { 0: 0, 1: 0, 2: 5, 3: 10, 4: 20, 5: 30, 6: 40, 7: 50, 8: 60 },
  [STRUCTURE_ROAD]: { 0: 2500, 1: 2500, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
  [STRUCTURE_WALL]: { 0: 0, 1: 0, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
  [STRUCTURE_RAMPART]: { 0: 0, 1: 0, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
  [STRUCTURE_LINK]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 2, 6: 3, 7: 4, 8: 6 },
  [STRUCTURE_STORAGE]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
  [STRUCTURE_TOWER]: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 6 },
  [STRUCTURE_OBSERVER]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
  [STRUCTURE_POWER_SPAWN]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
  [STRUCTURE_EXTRACTOR]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1 },
  [STRUCTURE_TERMINAL]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1 },
  [STRUCTURE_LAB]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 3, 7: 6, 8: 10 },
  [STRUCTURE_CONTAINER]: { 0: 5, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5 },
  [STRUCTURE_NUKER]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
  [STRUCTURE_FACTORY]: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 1 },
};

/**
 * Bunker Layout Definition
 * Positionen relativ zum Zentrum (0,0)
 * Format: { x: offsetX, y: offsetY, structureType: STRUCTURE_TYPE, priority: number }
 * Priority bestimmt die Baureihenfolge (niedriger = früher)
 */
const BUNKER_LAYOUT = {
  // Spawn im Zentrum (wird als Referenzpunkt verwendet)
  spawns: [
    { x: 0, y: 0, priority: 1 },
    { x: -2, y: 2, priority: 100 },
    { x: 2, y: 2, priority: 101 },
  ],

  // Storage zentral für kurze Wege
  storage: [{ x: 0, y: 1, priority: 10 }],

  // Terminal neben Storage
  terminal: [{ x: 1, y: 1, priority: 20 }],

  // Factory neben Terminal
  factory: [{ x: -1, y: 1, priority: 25 }],

  // Towers in strategischen Positionen (Schutz des Kerns)
  towers: [
    { x: 1, y: -1, priority: 5 },
    { x: -1, y: -1, priority: 6 },
    { x: 2, y: 0, priority: 30 },
    { x: -2, y: 0, priority: 31 },
    { x: 0, y: -2, priority: 32 },
    { x: 0, y: 2, priority: 33 },
  ],

  // Extensions in einem effizienten Muster um den Kern
  extensions: [
    // Ring 1 (RCL 2-3)
    { x: -1, y: -2, priority: 11 },
    { x: 1, y: -2, priority: 12 },
    { x: -2, y: -1, priority: 13 },
    { x: 2, y: -1, priority: 14 },
    { x: -2, y: 1, priority: 15 },
    // Ring 2 (RCL 3-4)
    { x: 2, y: 1, priority: 16 },
    { x: -3, y: 0, priority: 17 },
    { x: 3, y: 0, priority: 18 },
    { x: 0, y: -3, priority: 19 },
    { x: 0, y: 3, priority: 21 },
    // Ring 3 (RCL 4-5)
    { x: -3, y: -1, priority: 22 },
    { x: 3, y: -1, priority: 23 },
    { x: -3, y: 1, priority: 24 },
    { x: 3, y: 1, priority: 26 },
    { x: -1, y: -3, priority: 27 },
    { x: 1, y: -3, priority: 28 },
    { x: -1, y: 3, priority: 29 },
    { x: 1, y: 3, priority: 34 },
    { x: -2, y: -2, priority: 35 },
    { x: 2, y: -2, priority: 36 },
    // Ring 4 (RCL 5-6)
    { x: -4, y: 0, priority: 37 },
    { x: 4, y: 0, priority: 38 },
    { x: 0, y: -4, priority: 39 },
    { x: 0, y: 4, priority: 40 },
    { x: -3, y: -2, priority: 41 },
    { x: 3, y: -2, priority: 42 },
    { x: -3, y: 2, priority: 43 },
    { x: 3, y: 2, priority: 44 },
    { x: -2, y: -3, priority: 45 },
    { x: 2, y: -3, priority: 46 },
    // Ring 5 (RCL 6-7)
    { x: -2, y: 3, priority: 47 },
    { x: 2, y: 3, priority: 48 },
    { x: -4, y: -1, priority: 49 },
    { x: 4, y: -1, priority: 50 },
    { x: -4, y: 1, priority: 51 },
    { x: 4, y: 1, priority: 52 },
    { x: -1, y: -4, priority: 53 },
    { x: 1, y: -4, priority: 54 },
    { x: -1, y: 4, priority: 55 },
    { x: 1, y: 4, priority: 56 },
    // Ring 6 (RCL 7-8)
    { x: -4, y: -2, priority: 57 },
    { x: 4, y: -2, priority: 58 },
    { x: -4, y: 2, priority: 59 },
    { x: 4, y: 2, priority: 60 },
    { x: -2, y: -4, priority: 61 },
    { x: 2, y: -4, priority: 62 },
    { x: -2, y: 4, priority: 63 },
    { x: 2, y: 4, priority: 64 },
    { x: -3, y: -3, priority: 65 },
    { x: 3, y: -3, priority: 66 },
    { x: -3, y: 3, priority: 67 },
    { x: 3, y: 3, priority: 68 },
    // Zusätzliche Extensions für RCL 8
    { x: -5, y: 0, priority: 69 },
    { x: 5, y: 0, priority: 70 },
    { x: 0, y: -5, priority: 71 },
    { x: 0, y: 5, priority: 72 },
    { x: -4, y: -3, priority: 73 },
    { x: 4, y: -3, priority: 74 },
  ],

  // Labs in einem kompakten Cluster (für Reaktionen)
  labs: [
    { x: 3, y: 3, priority: 75 },
    { x: 4, y: 3, priority: 76 },
    { x: 5, y: 3, priority: 77 },
    { x: 3, y: 4, priority: 78 },
    { x: 4, y: 4, priority: 79 },
    { x: 5, y: 4, priority: 80 },
    { x: 3, y: 5, priority: 81 },
    { x: 4, y: 5, priority: 82 },
    { x: 5, y: 5, priority: 83 },
    { x: 6, y: 4, priority: 84 },
  ],

  // Links an strategischen Positionen
  links: [
    { x: -1, y: 0, priority: 85 }, // Beim Storage
    { x: 1, y: 0, priority: 86 }, // Beim Spawn
    // Weitere Links werden dynamisch bei Sources/Controller platziert
  ],

  // Observer
  observer: [{ x: -3, y: -3, priority: 95 }],

  // Power Spawn
  powerSpawn: [{ x: -1, y: 2, priority: 96 }],

  // Nuker (weit vom Zentrum)
  nuker: [{ x: -4, y: 3, priority: 97 }],

  // Roads (Hauptwege)
  roads: [
    // Kreuz durch das Zentrum
    { x: 0, y: -1, priority: 200 },
    { x: -1, y: 0, priority: 201 },
    { x: 1, y: 0, priority: 202 },
    { x: 0, y: 2, priority: 203 },
    // Äußerer Ring
    { x: -2, y: -2, priority: 204 },
    { x: -1, y: -2, priority: 205 },
    { x: 1, y: -2, priority: 206 },
    { x: 2, y: -2, priority: 207 },
    { x: -2, y: 2, priority: 208 },
    { x: 2, y: 2, priority: 209 },
  ],
};

/**
 * RoomPlanner Klasse
 */
function RoomPlanner(room) {
  this.room = room;
  this.roomName = room.name;
  this.memory = this._initMemory();
}

/**
 * Initialisiert den Memory für den Raum
 */
RoomPlanner.prototype._initMemory = function () {
  if (!Memory.rooms) {
    Memory.rooms = {};
  }
  if (!Memory.rooms[this.roomName]) {
    Memory.rooms[this.roomName] = {};
  }
  if (!Memory.rooms[this.roomName].planner) {
    Memory.rooms[this.roomName].planner = {
      centerX: null,
      centerY: null,
      layoutGenerated: false,
      plannedStructures: [],
    };
  }
  return Memory.rooms[this.roomName].planner;
};

/**
 * Hauptfunktion - Plant und baut Strukturen
 */
RoomPlanner.prototype.run = function () {
  // Nur für eigene Räume mit Controller
  if (!this.room.controller || !this.room.controller.my) {
    return;
  }

  const rcl = this.room.controller.level;

  // Zentrum bestimmen (basierend auf erstem Spawn)
  if (!this._hasCenter()) {
    this._findCenter();
  }

  // Layout generieren wenn noch nicht geschehen
  if (!this.memory.layoutGenerated && this._hasCenter()) {
    this._generateLayout();
  }

  // Construction Sites platzieren
  if (this.memory.layoutGenerated) {
    this._placeConstructionSites(rcl);
  }

  // Spezielle Strukturen platzieren (Extractor, Container bei Sources)
  this._placeSpecialStructures(rcl);
};

/**
 * Prüft ob ein Zentrum definiert ist
 */
RoomPlanner.prototype._hasCenter = function () {
  return this.memory.centerX !== null && this.memory.centerY !== null;
};

/**
 * Findet das Zentrum basierend auf dem ersten Spawn
 */
RoomPlanner.prototype._findCenter = function () {
  const spawns = this.room.find(FIND_MY_SPAWNS);
  
  if (spawns.length > 0) {
    // Verwende ersten Spawn als Zentrum
    this.memory.centerX = spawns[0].pos.x;
    this.memory.centerY = spawns[0].pos.y;
    Log.info(`RoomPlanner: Zentrum für ${this.roomName} gefunden bei (${this.memory.centerX}, ${this.memory.centerY})`, "RoomPlanner");
    return true;
  }

  // Kein Spawn vorhanden - versuche optimale Position zu finden
  const centerPos = this._calculateOptimalCenter();
  if (centerPos) {
    this.memory.centerX = centerPos.x;
    this.memory.centerY = centerPos.y;
    Log.info(`RoomPlanner: Optimales Zentrum für ${this.roomName} berechnet bei (${this.memory.centerX}, ${this.memory.centerY})`, "RoomPlanner");
    return true;
  }

  return false;
};

/**
 * Berechnet die optimale Zentrumsposition
 */
RoomPlanner.prototype._calculateOptimalCenter = function () {
  const sources = this.room.find(FIND_SOURCES);
  const controller = this.room.controller;
  
  if (!controller) return null;

  let bestPos = null;
  let bestScore = Infinity;

  // Durchsuche mögliche Positionen
  for (let x = 6; x < 44; x++) {
    for (let y = 6; y < 44; y++) {
      // Prüfe ob Position und Umgebung frei sind
      if (!this._isValidCenterPosition(x, y)) continue;

      // Berechne Score (Summe der Distanzen zu Sources und Controller)
      let score = 0;
      const pos = new RoomPosition(x, y, this.roomName);
      
      for (const source of sources) {
        score += pos.getRangeTo(source.pos);
      }
      score += pos.getRangeTo(controller.pos) * 0.5; // Controller weniger gewichten

      if (score < bestScore) {
        bestScore = score;
        bestPos = { x, y };
      }
    }
  }

  return bestPos;
};

/**
 * Prüft ob eine Position als Zentrum geeignet ist
 */
RoomPlanner.prototype._isValidCenterPosition = function (x, y) {
  const terrain = this.room.getTerrain();
  const range = 5; // Benötigter freier Bereich um das Zentrum

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const checkX = x + dx;
      const checkY = y + dy;

      // Randprüfung
      if (checkX < 2 || checkX > 47 || checkY < 2 || checkY > 47) {
        return false;
      }

      // Wand-Prüfung
      if (terrain.get(checkX, checkY) === TERRAIN_MASK_WALL) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Generiert das Layout basierend auf dem Bunker-Design
 */
RoomPlanner.prototype._generateLayout = function () {
  const centerX = this.memory.centerX;
  const centerY = this.memory.centerY;
  const terrain = this.room.getTerrain();
  const plannedStructures = [];

  // Hilfsfunktion zum Hinzufügen einer Struktur
  const addStructure = (offsetX, offsetY, structureType, priority) => {
    const x = centerX + offsetX;
    const y = centerY + offsetY;

    // Randprüfung
    if (x < 1 || x > 48 || y < 1 || y > 48) return;

    // Wand-Prüfung
    if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
      // Versuche alternative Position zu finden
      const altPos = this._findAlternativePosition(x, y, structureType);
      if (altPos) {
        plannedStructures.push({
          x: altPos.x,
          y: altPos.y,
          structureType,
          priority,
        });
      }
      return;
    }

    plannedStructures.push({ x, y, structureType, priority });
  };

  // Spawns hinzufügen
  BUNKER_LAYOUT.spawns.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_SPAWN, pos.priority);
  });

  // Storage
  BUNKER_LAYOUT.storage.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_STORAGE, pos.priority);
  });

  // Terminal
  BUNKER_LAYOUT.terminal.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_TERMINAL, pos.priority);
  });

  // Factory
  BUNKER_LAYOUT.factory.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_FACTORY, pos.priority);
  });

  // Towers
  BUNKER_LAYOUT.towers.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_TOWER, pos.priority);
  });

  // Extensions
  BUNKER_LAYOUT.extensions.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_EXTENSION, pos.priority);
  });

  // Labs
  BUNKER_LAYOUT.labs.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_LAB, pos.priority);
  });

  // Links
  BUNKER_LAYOUT.links.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_LINK, pos.priority);
  });

  // Observer
  BUNKER_LAYOUT.observer.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_OBSERVER, pos.priority);
  });

  // Power Spawn
  BUNKER_LAYOUT.powerSpawn.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_POWER_SPAWN, pos.priority);
  });

  // Nuker
  BUNKER_LAYOUT.nuker.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_NUKER, pos.priority);
  });

  // Roads
  BUNKER_LAYOUT.roads.forEach((pos) => {
    addStructure(pos.x, pos.y, STRUCTURE_ROAD, pos.priority);
  });

  // Sortiere nach Priorität
  plannedStructures.sort((a, b) => a.priority - b.priority);

  this.memory.plannedStructures = plannedStructures;
  this.memory.layoutGenerated = true;

  Log.success(`RoomPlanner: Layout für ${this.roomName} generiert mit ${plannedStructures.length} Strukturen`, "RoomPlanner");
};

/**
 * Findet eine alternative Position wenn die gewünschte blockiert ist
 */
RoomPlanner.prototype._findAlternativePosition = function (x, y, structureType) {
  const terrain = this.room.getTerrain();
  const range = 2;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const newX = x + dx;
      const newY = y + dy;

      if (newX < 1 || newX > 48 || newY < 1 || newY > 48) continue;
      if (terrain.get(newX, newY) === TERRAIN_MASK_WALL) continue;

      // Prüfe ob Position bereits belegt ist
      const structures = this.room.lookForAt(LOOK_STRUCTURES, newX, newY);
      const sites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, newX, newY);

      if (structures.length === 0 && sites.length === 0) {
        return { x: newX, y: newY };
      }
    }
  }

  return null;
};

/**
 * Platziert Construction Sites basierend auf RCL
 */
RoomPlanner.prototype._placeConstructionSites = function (rcl) {
  const existingSites = this.room.find(FIND_CONSTRUCTION_SITES);
  
  // Limit für Construction Sites (max 100 pro Raum, aber wir begrenzen auf weniger für Effizienz)
  const maxSites = 5;
  if (existingSites.length >= maxSites) {
    return;
  }

  let sitesPlaced = 0;

  for (const planned of this.memory.plannedStructures) {
    if (sitesPlaced >= maxSites - existingSites.length) break;

    const { x, y, structureType } = planned;

    // Prüfe ob Struktur bei aktuellem RCL gebaut werden kann
    if (!this._canBuildStructure(structureType, rcl)) {
      continue;
    }

    // Prüfe ob bereits Struktur oder Construction Site vorhanden
    const pos = new RoomPosition(x, y, this.roomName);
    const existingStructures = pos.lookFor(LOOK_STRUCTURES);
    const existingConstSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

    // Prüfe ob bereits eine Struktur dieses Typs existiert
    const hasStructure = existingStructures.some(
      (s) => s.structureType === structureType || (s.structureType !== STRUCTURE_ROAD && structureType !== STRUCTURE_ROAD)
    );
    const hasSite = existingConstSites.some((s) => s.structureType === structureType);

    if (hasStructure || hasSite) {
      continue;
    }

    // Roads können über anderen Strukturen gebaut werden, andere nicht
    if (structureType !== STRUCTURE_ROAD) {
      const blockingStructure = existingStructures.find(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART
      );
      if (blockingStructure) {
        continue;
      }
    }

    // Versuche Construction Site zu platzieren
    const result = this.room.createConstructionSite(x, y, structureType);
    
    if (result === OK) {
      sitesPlaced++;
      Log.debug(`RoomPlanner: Construction Site für ${structureType} bei (${x}, ${y}) platziert`, "RoomPlanner");
    } else if (result === ERR_FULL) {
      // Bereits zu viele Sites
      break;
    } else if (result !== ERR_INVALID_TARGET && result !== ERR_RCL_NOT_ENOUGH) {
      Log.warn(`RoomPlanner: Konnte ${structureType} nicht bei (${x}, ${y}) platzieren. Fehler: ${result}`, "RoomPlanner");
    }
  }
};

/**
 * Prüft ob eine Struktur bei gegebenem RCL gebaut werden kann
 */
RoomPlanner.prototype._canBuildStructure = function (structureType, rcl) {
  // Anzahl erlaubter Strukturen bei diesem RCL
  const maxAllowed = CONTROLLER_STRUCTURES[structureType] ? CONTROLLER_STRUCTURES[structureType][rcl] : 0;
  
  if (maxAllowed === 0) {
    return false;
  }

  // Zähle existierende Strukturen dieses Typs
  const existingStructures = this.room.find(FIND_STRUCTURES, {
    filter: (s) => s.structureType === structureType,
  });

  // Zähle Construction Sites dieses Typs
  const existingSites = this.room.find(FIND_CONSTRUCTION_SITES, {
    filter: (s) => s.structureType === structureType,
  });

  const totalCount = existingStructures.length + existingSites.length;

  return totalCount < maxAllowed;
};

/**
 * Platziert spezielle Strukturen (Extractor, Container bei Sources/Controller)
 */
RoomPlanner.prototype._placeSpecialStructures = function (rcl) {
  // Extractor bei Mineral (RCL 6+)
  if (rcl >= 6) {
    this._placeExtractor();
  }

  // Container bei Sources (ab RCL 1)
  this._placeSourceContainers();

  // Container beim Controller (ab RCL 1)
  this._placeControllerContainer();

  // Links bei Sources (RCL 5+)
  if (rcl >= 5) {
    this._placeSourceLinks();
  }

  // Link beim Controller (RCL 5+)
  if (rcl >= 5) {
    this._placeControllerLink();
  }
};

/**
 * Platziert Extractor beim Mineral
 */
RoomPlanner.prototype._placeExtractor = function () {
  const minerals = this.room.find(FIND_MINERALS);
  if (minerals.length === 0) return;

  const mineral = minerals[0];
  
  // Prüfe ob bereits Extractor vorhanden
  const existingExtractor = mineral.pos.lookFor(LOOK_STRUCTURES).find((s) => s.structureType === STRUCTURE_EXTRACTOR);
  const existingSite = mineral.pos.lookFor(LOOK_CONSTRUCTION_SITES).find((s) => s.structureType === STRUCTURE_EXTRACTOR);

  if (!existingExtractor && !existingSite) {
    const result = this.room.createConstructionSite(mineral.pos, STRUCTURE_EXTRACTOR);
    if (result === OK) {
      Log.debug(`RoomPlanner: Extractor Construction Site beim Mineral platziert`, "RoomPlanner");
    }
  }

  // Container neben Mineral
  this._placeContainerNear(mineral.pos, "mineral");
};

/**
 * Platziert Container bei Sources
 */
RoomPlanner.prototype._placeSourceContainers = function () {
  const sources = this.room.find(FIND_SOURCES);
  
  for (const source of sources) {
    this._placeContainerNear(source.pos, "source");
  }
};

/**
 * Platziert Container beim Controller
 */
RoomPlanner.prototype._placeControllerContainer = function () {
  if (!this.room.controller) return;
  this._placeContainerNear(this.room.controller.pos, "controller");
};

/**
 * Platziert einen Container in der Nähe einer Position
 */
RoomPlanner.prototype._placeContainerNear = function (pos, type) {
  const range = type === "controller" ? 2 : 1;
  
  // Prüfe ob bereits Container in Reichweite
  const nearbyContainers = pos.findInRange(FIND_STRUCTURES, range, {
    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
  });
  
  const nearbySites = pos.findInRange(FIND_CONSTRUCTION_SITES, range, {
    filter: (s) => s.structureType === STRUCTURE_CONTAINER,
  });

  if (nearbyContainers.length > 0 || nearbySites.length > 0) {
    return;
  }

  // Prüfe ob Container-Limit erreicht
  if (!this._canBuildStructure(STRUCTURE_CONTAINER, this.room.controller.level)) {
    return;
  }

  // Finde beste Position für Container
  const terrain = this.room.getTerrain();
  let bestPos = null;
  let bestScore = Infinity;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;

      const x = pos.x + dx;
      const y = pos.y + dy;

      if (x < 1 || x > 48 || y < 1 || y > 48) continue;
      if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

      const checkPos = new RoomPosition(x, y, this.roomName);
      
      // Prüfe ob Position frei ist
      const structures = checkPos.lookFor(LOOK_STRUCTURES);
      const sites = checkPos.lookFor(LOOK_CONSTRUCTION_SITES);
      
      if (structures.length > 0 || sites.length > 0) continue;

      // Score: Distanz zum Zentrum (wenn vorhanden)
      let score = 0;
      if (this._hasCenter()) {
        const centerPos = new RoomPosition(this.memory.centerX, this.memory.centerY, this.roomName);
        score = checkPos.getRangeTo(centerPos);
      }

      if (score < bestScore) {
        bestScore = score;
        bestPos = checkPos;
      }
    }
  }

  if (bestPos) {
    const result = this.room.createConstructionSite(bestPos, STRUCTURE_CONTAINER);
    if (result === OK) {
      Log.debug(`RoomPlanner: Container Construction Site bei ${type} platziert`, "RoomPlanner");
    }
  }
};

/**
 * Platziert Links bei Sources
 */
RoomPlanner.prototype._placeSourceLinks = function () {
  const sources = this.room.find(FIND_SOURCES);
  
  for (const source of sources) {
    this._placeLinkNear(source.pos, "source");
  }
};

/**
 * Platziert Link beim Controller
 */
RoomPlanner.prototype._placeControllerLink = function () {
  if (!this.room.controller) return;
  this._placeLinkNear(this.room.controller.pos, "controller");
};

/**
 * Platziert einen Link in der Nähe einer Position
 */
RoomPlanner.prototype._placeLinkNear = function (pos, type) {
  const range = 2;
  
  // Prüfe ob bereits Link in Reichweite
  const nearbyLinks = pos.findInRange(FIND_STRUCTURES, range, {
    filter: (s) => s.structureType === STRUCTURE_LINK,
  });
  
  const nearbySites = pos.findInRange(FIND_CONSTRUCTION_SITES, range, {
    filter: (s) => s.structureType === STRUCTURE_LINK,
  });

  if (nearbyLinks.length > 0 || nearbySites.length > 0) {
    return;
  }

  // Prüfe ob Link-Limit erreicht
  if (!this._canBuildStructure(STRUCTURE_LINK, this.room.controller.level)) {
    return;
  }

  // Finde beste Position für Link
  const terrain = this.room.getTerrain();
  let bestPos = null;
  let bestScore = Infinity;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;

      const x = pos.x + dx;
      const y = pos.y + dy;

      if (x < 1 || x > 48 || y < 1 || y > 48) continue;
      if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

      const checkPos = new RoomPosition(x, y, this.roomName);
      
      // Prüfe ob Position frei ist
      const structures = checkPos.lookFor(LOOK_STRUCTURES);
      const sites = checkPos.lookFor(LOOK_CONSTRUCTION_SITES);
      
      const hasBlockingStructure = structures.some(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART
      );
      const hasBlockingSite = sites.some(
        (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART
      );
      
      if (hasBlockingStructure || hasBlockingSite) continue;

      // Score: Distanz zum Zentrum (wenn vorhanden)
      let score = 0;
      if (this._hasCenter()) {
        const centerPos = new RoomPosition(this.memory.centerX, this.memory.centerY, this.roomName);
        score = checkPos.getRangeTo(centerPos);
      }

      if (score < bestScore) {
        bestScore = score;
        bestPos = checkPos;
      }
    }
  }

  if (bestPos) {
    const result = this.room.createConstructionSite(bestPos, STRUCTURE_LINK);
    if (result === OK) {
      Log.debug(`RoomPlanner: Link Construction Site bei ${type} platziert`, "RoomPlanner");
    }
  }
};

/**
 * Visualisiert das geplante Layout (für Debugging)
 */
RoomPlanner.prototype.visualize = function () {
  if (!this.memory.layoutGenerated) return;

  const visual = this.room.visual;

  // Zeichne Zentrum
  if (this._hasCenter()) {
    visual.circle(this.memory.centerX, this.memory.centerY, {
      fill: "transparent",
      stroke: "#00ff00",
      strokeWidth: 0.2,
      radius: 0.5,
    });
  }

  // Zeichne geplante Strukturen
  const structureColors = {
    [STRUCTURE_SPAWN]: "#ffff00",
    [STRUCTURE_EXTENSION]: "#ffaa00",
    [STRUCTURE_TOWER]: "#ff0000",
    [STRUCTURE_STORAGE]: "#00ffff",
    [STRUCTURE_TERMINAL]: "#ff00ff",
    [STRUCTURE_LAB]: "#00ff00",
    [STRUCTURE_LINK]: "#0088ff",
    [STRUCTURE_FACTORY]: "#888888",
    [STRUCTURE_OBSERVER]: "#ffffff",
    [STRUCTURE_POWER_SPAWN]: "#ff8800",
    [STRUCTURE_NUKER]: "#880000",
    [STRUCTURE_ROAD]: "#aaaaaa",
  };

  for (const planned of this.memory.plannedStructures) {
    const color = structureColors[planned.structureType] || "#ffffff";
    visual.rect(planned.x - 0.4, planned.y - 0.4, 0.8, 0.8, {
      fill: color,
      opacity: 0.3,
      stroke: color,
      strokeWidth: 0.1,
    });
  }
};

/**
 * Setzt das Layout zurück (für Neuplanung)
 */
RoomPlanner.prototype.reset = function () {
  this.memory.centerX = null;
  this.memory.centerY = null;
  this.memory.layoutGenerated = false;
  this.memory.plannedStructures = [];
  Log.info(`RoomPlanner: Layout für ${this.roomName} zurückgesetzt`, "RoomPlanner");
};

/**
 * Gibt Statistiken über das geplante Layout zurück
 */
RoomPlanner.prototype.getStats = function () {
  if (!this.memory.layoutGenerated) {
    return { status: "nicht generiert" };
  }

  const stats = {
    center: { x: this.memory.centerX, y: this.memory.centerY },
    totalPlanned: this.memory.plannedStructures.length,
    byType: {},
  };

  for (const planned of this.memory.plannedStructures) {
    if (!stats.byType[planned.structureType]) {
      stats.byType[planned.structureType] = 0;
    }
    stats.byType[planned.structureType]++;
  }

  return stats;
};

module.exports = RoomPlanner;

