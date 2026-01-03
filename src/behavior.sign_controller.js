const Behavior = require("./behavior.base");

class SignControllerBehavior extends Behavior {
  constructor() {
    super("sign_controller");
  }

  when(creep, rc) {
    // Only sign controllers in rooms that have been analyzed but not yet signed
    const roomName = creep.room.name;
    Room.ensureMemory(roomName);
    const roomMemory = Memory.rooms[roomName];

    // Check if room has been analyzed (has lastCheck) but controller not signed
    const hasBeenAnalyzed = roomMemory.lastCheck !== undefined;
    const needsSigning = roomMemory.controllerSigned !== true;

    // Only activate if room has been analyzed and controller needs signing
    if (!hasBeenAnalyzed || !needsSigning) {
      return false;
    }

    // Check if controller exists and is not ours
    const {controller} = creep.room;
    if (!controller || controller.my) {
      return false;
    }

    return true;
  }

  completed(creep, rc) {
    const roomName = creep.room.name;
    Room.ensureMemory(roomName);
    const roomMemory = Memory.rooms[roomName];

    // Completed if controller is signed
    return roomMemory.controllerSigned === true;
  }

  work(creep, rc) {
    const roomName = creep.room.name;
    Room.ensureMemory(roomName);

    // Check if we're on an exit tile - move to center first
    const isOnExitTile = creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49;
    if (isOnExitTile) {
      const centerPos = new RoomPosition(25, 25, roomName);
      creep.moveTo(centerPos, {
        range: 20,
        maxRooms: 1,
        reusePath: 5,
      });
      return;
    }

    // Sign the controller
    creep.room.signController(creep);
  }
}

module.exports = new SignControllerBehavior();

