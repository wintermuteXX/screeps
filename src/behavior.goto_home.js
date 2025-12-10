const Behavior = require("./behavior.base");
const CONSTANTS = require("./config.constants");

class GotoHomeBehavior extends Behavior {
  constructor() {
    super("goto_home");
  }

  when(creep, rc) {
    return creep.room.name !== creep.memory.home;
  }

  completed(creep, rc) {
    const { BORDER_MIN, BORDER_MAX } = CONSTANTS.ROOM;
    return creep.room.name === creep.memory.home && 
           creep.pos.x > BORDER_MIN && creep.pos.x < BORDER_MAX && 
           creep.pos.y > BORDER_MIN && creep.pos.y < BORDER_MAX;
  }

  work(creep, rc) {
    if (creep.memory.home) {
      creep.travelTo(new RoomPosition(25, 25, creep.memory.home), {
        preferHighway: true,
      });
    }
  }
}

module.exports = new GotoHomeBehavior();
