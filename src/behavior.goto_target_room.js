const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const CONSTANTS = require("./config.constants");

class GotoTargetRoomBehavior extends Behavior {
  constructor() {
    super("goto_target_room");
  }

  when(creep, rc) {
    // Aktiv wenn ein Zielraum im Memory gespeichert ist und wir noch nicht dort sind
    return creep.memory.targetRoom && creep.memory.targetRoom !== creep.room.name;
  }

  completed(creep, rc) {
    // Fertig wenn wir im Zielraum sind und nicht mehr an der Grenze
    const { BORDER_MIN, BORDER_MAX } = CONSTANTS.ROOM;
    const isNotAtBorder = creep.pos.x > BORDER_MIN && creep.pos.x < BORDER_MAX &&
                          creep.pos.y > BORDER_MIN && creep.pos.y < BORDER_MAX;
    
    if (creep.memory.targetRoom === creep.room.name && isNotAtBorder) {
      // Log einmalig bei Ankunft
      if (creep.memory.travelingToTarget) {
        Log.success(`🚀 ${creep} arrived at target room ${creep.room}`, "goto_target_room");
        delete creep.memory.travelingToTarget;
      }
      return true;
    }
    return false;
  }

  work(creep, rc) {
    if (!creep.memory.targetRoom) {
      return;
    }

    // Log einmalig wenn wir zum Zielraum reisen
    if (!creep.memory.travelingToTarget) {
      Log.success(`🚀 ${creep} traveling to target room ${Game.rooms[creep.memory.targetRoom]}`, "goto_target_room");
      creep.memory.travelingToTarget = true;
    }

    const targetPos = new RoomPosition(25, 25, creep.memory.targetRoom);
    creep.travelTo(targetPos, {
      preferHighway: true,
      ensurePath: true,
      useFindRoute: true,
    });
  }
}

module.exports = new GotoTargetRoomBehavior();

