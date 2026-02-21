const Behavior = require("./behavior.base");
const Log = require("./lib.log");

/**
 * Power Creep behavior (first priority): enable power in the room the PC is in
 * when controller.isPowerEnabled is false. The PC must be adjacent to the controller
 * to call PowerCreep.enableRoom(controller).
 */
class EnableRoomBehavior extends Behavior {
  constructor() {
    super("enable_room");
  }

  when(pc, _rc) {
    if (!pc || !pc.room) return false;
    const controller = pc.room.controller;
    return controller && controller.my && !controller.isPowerEnabled;
  }

  completed(pc, _rc) {
    if (!pc || !pc.room) return true;
    const controller = pc.room.controller;
    return !controller || !controller.my || controller.isPowerEnabled;
  }

  work(pc, _rc) {
    const controller = pc.room.controller;
    if (!controller || !controller.my || controller.isPowerEnabled) return;

    if (pc.pos.getRangeTo(controller) > 1) {
      pc.travelTo(controller, { range: 1, visualizePathStyle: { stroke: "#00aaff" } });
      return;
    }

    const result = pc.enableRoom(controller);
    if (result === OK) {
      Log.success(`${controller.room} Power Creep ${pc} enabled power in room`, "EnableRoom");
    } else if (global.getErrorString) {
      Log.warn(`${controller.room} Power Creep ${pc} enableRoom failed: ${global.getErrorString(result)}`, "EnableRoom");
    }
  }
}

module.exports = new EnableRoomBehavior();
