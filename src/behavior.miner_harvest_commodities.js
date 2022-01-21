var Behavior = require("_behavior");
var b = new Behavior("miner_harvest_commodities");

b.when = function (creep, rc) {
    return creep.room.find(FIND_DEPOSITS);
};

b.completed = function (creep) {
    return creep.room.mineral.mineralAmount === 0;
};

b.work = function (creep, rc) {
        var target = creep.getTarget();

        if (target === null) {
            creep.target = creep.room.find(FIND_DEPOSITS)[0];
            target = Game.getObjectById(creep.target);
        }

        if (target !== null) {
            if (creep.room.extractor && creep.room.extractor.container) {
                let result = creep.harvest(target);

                switch (result) {
                    case OK:
                    case ERR_NOT_IN_RANGE:
                        creep.travelTo(target);
                        break;
                    default:
                        Log.warn(`unknown result from (creep ${creep}).harvest commodity (${target}): ${result}`, "Creep");
                }
            }

        };

        module.exports = b;