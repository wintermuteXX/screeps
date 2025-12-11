# Beispiel Memory-Objekt nach `analyzeRoom()`

Dieses Dokument zeigt, wie das Memory-Objekt (`room.memory`) nach einer vollständigen Analyse mit `analyzeRoom(room, true)` aussehen könnte.

## Vollständiges Beispiel

```javascript
{
  roomType: "ROOMTYPE_CONTROLLER",  // oder "ROOMTYPE_CORE", "ROOMTYPE_SOURCEKEEPER", "ROOMTYPE_ALLEY"
  keeperLairs: 3,  // nur bei ROOMTYPE_SOURCEKEEPER
  sources: [
    { id: "5a1b2c3d4e5f6g7h8i9j0k1", x: 15, y: 23, freeSpaces: 3 },
    { id: "5a1b2c3d4e5f6g7h8i9j0k2", x: 42, y: 18, freeSpaces: 5 }
  ],
  // Anzahl der Sources kann über sources.length ermittelt werden
  mineral: {
    type: "H",
    x: 35,
    y: 12,
    id: "5a1b2c3d4e5f6g7h8i9j0k3"
  },
  portal: {  // optional
    id: "5a1b2c3d4e5f6g7h8i9j0k4",
    x: 25,
    y: 25,
    destination: {
      room: "W10N5",
      shard: "shard2"
    }
  },
  powerBank: {  // optional
    id: "5a1b2c3d4e5f6g7h8i9j0k5",
    x: 10,
    y: 10,
    power: 5000
  },
  deposits: [  // optional
    {
      id: "5a1b2c3d4e5f6g7h8i9j0k6",
      x: 20,
      y: 30,
      type: "deposit_energy",
      cooldown: 50000
    }
  ],
  // Dynamische Daten (nur bei fullAnalysis = true):
  controller: {
    level: 3,
    progress: 15000,
    progressTotal: 45000,
    owner: "PlayerName",  // oder null
    reservation: {  // oder null
      username: "ReserverName",
      ticksToEnd: 5000
    },
    upgradeBlocked: 0,
    my: false
  },
  structures: {
    spawn: 1,
    extension: 10,
    storage: { id: "5a1b2c3d4e5f6g7h8i9j0k7", x: 25, y: 25 },  // oder null
    terminal: { id: "5a1b2c3d4e5f6g7h8i9j0k8", x: 26, y: 25 },  // oder null
    factory: null,  // oder { id: "...", x: ..., y: ... }
    tower: 2,
    link: 3,
    lab: 6,
    nuker: 0,
    observer: 1,
    powerSpawn: 0
  },
  hostiles: {
    creeps: 2,
    structures: 5,
    usernames: ["EnemyPlayer1", "EnemyPlayer2"]
  },
  invaderCores: [  // optional
    {
      id: "5a1b2c3d4e5f6g7h8i9j0k9",
      x: 40,
      y: 40,
      level: 1,
      ticksToDeploy: 5000
    }
  ],
  energy: {
    available: 550,
    capacity: 800
  },
  score: {
    total: 2100,
    breakdown: {
      isFree: 1000,
      hasTwoSources: 500,
      lowSwamp: 250,
      swampPercentage: 8.3,
      highFreeSpace: 150,
      freeSpacePercentage: 87.5,
      newMineral: 400,
      mineralType: "H"
    }
  }
}
```

## Hinweise

- **Statische Daten**: Werden nur einmal gesetzt (roomType, sources, mineral, etc.)
- **Dynamische Daten**: Werden nur bei `fullAnalysis = true` aktualisiert (controller, structures, hostiles, energy, score)
- **Optionale Felder**: portal, powerBank, deposits, invaderCores können fehlen, wenn sie nicht vorhanden sind
- **Memory.rooms[room.name]**: Enthält zusätzlich `lastCheck: Game.time` für jeden analysierten Raum

