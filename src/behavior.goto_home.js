var Behavior = require("_behavior");
var b = new Behavior("goto_home");

b.when = function (creep, rc) {
    return creep.room.name !== creep.memory.home
}
b.completed = function (creep, rc) {
    return (creep.room.name == creep.memory.home && creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49)
};

b.work = function (creep, rc) {
    console.log("Home " + creep.memory.home)
    if (creep.memory.home) {
        creep.travelTo(new RoomPosition(25, 25, creep.memory.home), {
            preferHighway: true
        });
    }
};

module.exports = b;