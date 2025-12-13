# TODO2 - Great Filters Checklist

Basierend auf [Screeps Wiki - Great Filters](https://wiki.screepspl.us/Great_Filters/)

## ✅ Creep Management - Roles, States & Tasks/Goals

- [x] **Roles** - Rollenbasierte Creep-Verwaltung implementiert (config.creeps.js, ControllerCreep.js)
- [x] **Tasks/Goals** - Behavior-System für dynamische Aufgabenvergabe implementiert (_behavior.js, behavior.*.js)

## ✅ Automatic Spawning

- [x] **Headcount** - Automatisches Spawning basierend auf Creep-Zählung (ControllerSpawn.js, ControllerRoom.populate())
- [ ] **Part-Count Balancing** - Spawning basierend auf benötigten Body-Parts statt nur Creep-Anzahl
- [ ] **Spawn Queues** - Warteschlangen-System für Spawn-Prioritäten
- [ ] **Cold-boot** - Automatisches Wiederaufbauen nach kompletter Auslöschung

## ✅ Automatic Room Defense

- [x] **Tower Defense** - Automatische Turm-Verteidigung implementiert (ControllerTower.js)
- [x] **Creep Based-defense** - Defender-Rolle für Creep-Verteidigung (config.creeps.js: defender)
- [ ] **Rampart-Defenders** - Spezielle Defender für Ramparts
- [ ] **Repair spam** - Automatische Reparatur von Wänden/Ramparts
- [ ] **Active-Counter** - Proaktive Verteidigung gegen Angriffe
- [ ] **SafeMode** - Automatische Aktivierung von Safe Mode bei Bedrohung

## ✅ Effectively Harvesting Energy & Remote Mining

- [x] **Harvesting** - Basis-Harvesting implementiert (behavior.harvest.js, behavior.miner_harvest.js)
- [x] **Hauling** - Transport-System implementiert (LogisticsGroup.js, transporter role)
- [ ] **Remote Mining** - Mining in entfernten Räumen (in TODO.md erwähnt, aber nicht vollständig)
- [ ] **Reserving** - Automatisches Reservieren von Remote-Räumen
- [ ] **Harvesting Types (Kardashev scale)**
  - [x] Type Zero - Basis-Harvesting
  - [x] Type One - Erweiterte Harvesting-Methoden
  - [ ] Type Two - Optimierte Multi-Room Harvesting
  - [ ] Type Three - Advanced Harvesting mit Boosts
  - [ ] Type Four+ - Weitere Optimierungen

## ✅ Claiming new rooms

- [x] **Claiming** - Claimer-Rolle und Behavior implementiert (behavior.claim_controller.js)
- [x] **Building** - Automatisches Bauen in neuen Räumen (behavior.build_structures.js, RoomPlanner.js)
- [ ] **Multi-Room Management** - Verbesserte Verwaltung mehrerer Räume

## ✅ Room Offense

- [x] **Locating Targets** - Angriffsziele finden (behavior.attack_enemy.js)
- [x] **Choosing an attack method** - Attacker-Rolle implementiert (config.creeps.js: attacker)
- [x] **More automatic attacks** - Automatische Angriffe auf Gebäude (behavior.clear_enemy_buildings.js)

## ✅ Scouting & Storing information

- [x] **Creep Scouting** - Scout-Rolle implementiert (behavior.scout.js)
- [ ] **Observation Scouting** - Scouting mit Observer-Towers
- [ ] **Storing Information** - Verbessertes Speichern von Scouting-Daten

## ✅ Market

- [x] **Getting First Credits** - Terminal-System implementiert (ControllerTerminal.js)
- [x] **Buying/Selling** - Automatischer Handel implementiert (marketCalculator.js)
- [ ] **Converting to Steam** - Steam-Konvertierung

## ✅ Lab logic & Boosts

- [x] **Mining/buying minerals** - Mineral-Harvesting implementiert (behavior.miner_harvest_mineral.js)
- [x] **Determining what to make** - Lab-Reaktionen implementiert (ControllerLab.js)
- [ ] **Boosting creeps** - Automatisches Boosten von Creeps

## Highway Harvesting

- [ ] **Detecting** - Erkennung von Highway-Containern
- [ ] **Harvesting** - Harvesting von Highways
- [ ] **Hauling** - Transport von Highway-Ressourcen

## Source-Keeper Harvesting

- [ ] **Suppressing the Keepers** - Unterdrückung der Source Keepers
- [ ] **Harvesting & hauling the resources** - Mining und Transport
- [ ] **Invaders & raids** - Verteidigung gegen Invader und Raids

## Power Creeps

- [ ] **Getting the power** - Power generieren
- [ ] **Creating the PowerCreeps** - Power Creeps erstellen (in TODO.md erwähnt)
- [ ] **Using the powers** - Power Creeps nutzen
- [ ] **Auto renew** - Automatische Erneuerung (in TODO.md erwähnt)

## Automatic Factories

- [x] **Gathering Resources & Power Creeps** - Factory-System teilweise implementiert (ControllerFactory.js)
- [ ] **Production** - Vollständige automatische Produktion
- [ ] **Balancing / Logistics** - Ausgewogene Ressourcen-Verteilung

## Inter-sharding (when shards exist)

- [ ] **Insuring a Memory backup** - Memory-Backup für Shards
- [ ] **Claiming in range** - Claiming in anderen Shards
- [ ] **Code runs on all shards** - Shard-übergreifende Code-Ausführung

## Strongholds

- [ ] **Detection** - Erkennung von Strongholds
- [ ] **Attacking** - Angriff auf Strongholds

## ✅ Better Pathing & Caching Paths

- [x] **Optimizing MoveTo** - Pathfinding implementiert (Traveler.js)
  - [ ] **reusePath** - Pfad-Wiederverwendung optimieren
  - [ ] **ignoreCreeps** - Option zum Ignorieren von Creeps
  - [ ] **range** - Range-basierte Pfadfindung
- [x] **Using PathFinder.search()** - PathFinder wird verwendet (Traveler.js)
- [ ] **CostMatricies** - Erweiterte Cost-Matrix-Nutzung
- [ ] **Caching & Reusing paths** - Verbesserte Pfad-Caching-Strategie

## ✅ Automated Room Planning & Building

- [x] **Locating Potential Rooms** - Room-Planner implementiert (RoomPlanner.js)
- [x] **Building a Plan / Searching for a Location** - Planungssystem vorhanden
  - [ ] **Bunker** - Bunker-Planung
  - [ ] **Stamp/Tile** - Stamp/Tile-basierte Planung
  - [x] **Dynamic Pattern Generation** - Dynamische Muster-Generierung (utils.roomPlanner.js)
- [x] **Caching & Executing the Plan** - Plan-Ausführung implementiert
- [ ] **Wall/Rampart Building** - Automatisches Bauen von Wänden/Ramparts (in TODO.md erwähnt)
- [ ] **Roads to Sources/Controller** - Automatisches Straßenbauen (in TODO.md erwähnt)

## (Seasonal World) Score/Symbol Gathering & Depositing

- [ ] **Locating** - Erkennung von Score/Symbol-Objekten
- [ ] **Hauling** - Transport zu Depots
- [ ] **Scoring** - Automatisches Einzahlen für Punkte

## Weitere Verbesserungen (aus TODO.md)

- [x] **CPU Usage Analysis** - CPU-Nutzung über Zeit analysieren
- [ ] **Dynamic Move Parts Calculation** - Dynamische Berechnung von MOVE-Parts (ControllerSpawn.js)
- [ ] **Builder/Supporter Optimization** - Optimierung der Builder/Supporter-Berechnung
- [ ] **Multiple Harvesters** - Mehrere Harvester für niedriges RCL
- [ ] **Consolidate Transport Behavior** - Transport-Verhalten konsolidieren

