var Behavior = require("_behavior");
var b = new Behavior("miner_harvest_commodities");

b.when = function (creep, rc) {
    return (creep.room.find(FIND_DEPOSITS) && creep.store.getFreeCapacity() !== 0 && creep.ticksToLive >= 350)
};

b.completed = function (creep) {
    return (creep.store.getFreeCapacity() == 0 || creep.ticksToLive < 250 || !!creep.room.find(FIND_DEPOSITS))
};

b.work = function (creep, rc) {
    var target = creep.getTarget();

    if (target === null) {
        var tar = creep.room.find(FIND_DEPOSITS)
        if (tar.length) {
            creep.target = tar[0].id
            target = tar[0];
        }
    }

    if (target !== null && creep.pos.isNearTo(target) && target.cooldown == 0) {
        creep.harvest(target);
    } else {
        creep.travelTo(target);
    }
};

module.exports = b;