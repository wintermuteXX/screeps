var Behavior = require("_behavior");
var b = new Behavior("transfer_storage");

b.when = function (creep, rc) {
    return creep.room.storage
}

b.completed = function (creep, rc) {
    return (creep.store.getUsedCapacity() == 0)
};

b.work = function (creep, rc) {

    let result = creep.transfer(creep.room.storage, _.last(Object.keys(creep.carry)))
    switch (result) {
        case ERR_NOT_IN_RANGE:
            creep.travelTo(creep.room.storage);
        case OK:
    };
}
module.exports = b;