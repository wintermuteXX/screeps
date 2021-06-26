var Behavior = require("_behavior");
var b = new Behavior("place_spawn");

function findFlag(rc) {
    return _.find(Game.flags, {
        'color': COLOR_WHITE
    });
}

b.when = function (creep, rc) {
    let flag = findFlag(rc);
    let spawns = rc.spawns;
    return !!flag && flag.room == creep.room && !!spawns;
};

b.completed = function (creep, rc) {
    let flag = findFlag(rc);
    let spawns = rc.spawns;
    return !flag || (flag.room !== creep.room) || !spawns;
};

b.work = function (creep, rc) {
    let position = rc.centerPoint();
    let result = creep.room.createConstructionSite(position, STRUCTURE_SPAWN);
    if (result == ERR_RCL_NOT_ENOUGH) {
        // Shortcut for Claimer - remove if other creeps are using this behavior
        creep.suicide()
    }
    if (result == OK) {
        Log.success(`Build a new construction site for Spawn in ${creep.room.name}`, "place_spawn")
    } else {
        Log.error(`Could not build Spawn in ${creep.room.name} Error: ${result}`, "place_spawn")
    }
};

module.exports = b;