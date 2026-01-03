const Behavior = require("./behavior.base");
const RoomPlanner = require("./service.planner");
const Log = require("./lib.log");
const duneConfig = require("./config.dune");

class PlaceSpawnBehavior extends Behavior {
  constructor() {
    super("place_spawn");
  }

  when(creep, rc) {
    const flag = creep.room.findFlagByColor(COLOR_WHITE);
    const {spawns} = rc.room; // Use room.spawns prototype
    return !!flag && flag.room === creep.room && spawns && spawns.length > 0;
  }

  completed(creep, rc) {
    const flag = creep.room.findFlagByColor(COLOR_WHITE);
    const {spawns} = rc.room; // Use room.spawns prototype
    return !flag || (flag.room !== creep.room) || !spawns || spawns.length === 0;
  }

  work(creep, rc) {
    // Use RoomPlanner to find optimal center position
    const planner = new RoomPlanner(creep.room);
    const centerPos = planner._calculateOptimalCenter();

    if (!centerPos) {
      Log.error(`Could not find optimal center position in ${creep.room.name}`, "place_spawn");
      return;
    }

    const position = new RoomPosition(centerPos.x, centerPos.y, creep.room.name);
    const planetName = duneConfig.getRandomPlanet();
    const result = creep.room.createConstructionSite(position, STRUCTURE_SPAWN, planetName);

    if (result === ERR_RCL_NOT_ENOUGH) {
      // Shortcut for Claimer - remove if other creeps are using this behavior
      creep.suicide();
    }
    if (result === OK) {
      Log.success(`Build a new construction site for Spawn "${planetName}" in ${creep.room.name} at (${position.x}, ${position.y})`, "place_spawn");
    } else {
      Log.error(`Could not build Spawn in ${creep.room.name} at (${position.x}, ${position.y}). Error: ${global.getErrorString(result)}`, "place_spawn");
    }
  }
}

module.exports = new PlaceSpawnBehavior();
