const Behavior = require("_behavior");
const RoomPlanner = require("RoomPlanner");
const Log = require("Log");
const b = new Behavior("place_spawn");

function findFlag(rc) {
  return _.find(Game.flags, {
    'color': COLOR_WHITE
  });
}

b.when = function (creep, rc) {
  let flag = findFlag(rc);
  let spawns = rc.room.spawns; // Use room.spawns prototype
  return !!flag && flag.room == creep.room && spawns && spawns.length > 0;
};

b.completed = function (creep, rc) {
  let flag = findFlag(rc);
  let spawns = rc.room.spawns; // Use room.spawns prototype
  return !flag || (flag.room !== creep.room) || !spawns || spawns.length === 0;
};

b.work = function (creep, rc) {
  // Use RoomPlanner to find optimal center position
  const planner = new RoomPlanner(creep.room);
  const centerPos = planner._calculateOptimalCenter();
  
  if (!centerPos) {
    Log.error(`Could not find optimal center position in ${creep.room.name}`, "place_spawn");
    return;
  }
  
  let position = new RoomPosition(centerPos.x, centerPos.y, creep.room.name);
  let result = creep.room.createConstructionSite(position, STRUCTURE_SPAWN);
  
  if (result == ERR_RCL_NOT_ENOUGH) {
    // Shortcut for Claimer - remove if other creeps are using this behavior
    creep.suicide();
  }
  if (result == OK) {
    Log.success(`Build a new construction site for Spawn in ${creep.room.name} at (${position.x}, ${position.y})`, "place_spawn");
  } else {
    Log.error(`Could not build Spawn in ${creep.room.name} at (${position.x}, ${position.y}). Error: ${result}`, "place_spawn");
  }
};

module.exports = b;