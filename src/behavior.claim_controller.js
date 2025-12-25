const Behavior = require("./behavior.base");
const Log = require("./lib.log");

class ClaimControllerBehavior extends Behavior {
  constructor() {
    super("claim_controller");
  }

  when(creep, rc) {
    // Wenn Zielraum im Memory gespeichert ist und wir noch nicht dort sind, reise dorthin
    if (creep.memory.targetRoom && creep.memory.targetRoom !== creep.room.name) {
      return true; // Wir müssen noch zum Zielraum reisen
    }
    // Wenn wir im Zielraum sind, prüfe ob Controller geclaimt werden muss
    return creep.room.controller && !creep.room.controller.my;
  }

  completed(creep, rc) {
    // Fertig wenn Controller geclaimt ist
    return creep.room.controller && creep.room.controller.my;
  }

  work(creep, rc) {
    // Wenn wir noch nicht im Zielraum sind, reise dorthin
    if (creep.memory.targetRoom && creep.memory.targetRoom !== creep.room.name) {
      // Log einmalig wenn wir zum Zielraum reisen
      if (!creep.memory.travelingToTarget) {
        Log.success(`🏰 ${creep} traveling to target room ${creep.memory.targetRoom}`, "claim_controller");
        creep.memory.travelingToTarget = true;
      }

      const targetPos = new RoomPosition(25, 25, creep.memory.targetRoom);
      creep.travelTo(targetPos, {
        preferHighway: true,
        ensurePath: true,
        useFindRoute: true,
      });
      return;
    }

    // Wenn wir im Zielraum angekommen sind, lösche Travel-Flag
    if (creep.memory.travelingToTarget) {
      Log.success(`🏰 ${creep} arrived at target room ${creep.room.name}`, "claim_controller");
      delete creep.memory.travelingToTarget;
    }

    // Wenn wir im Zielraum sind, claim den Controller
    if (creep.pos.isNearTo(creep.room.controller)) {
      const result = creep.claimController(creep.room.controller);
      if (result === OK) {
        Log.success(`🏰 ${creep} successfully claimed controller in ${creep.room.name}`, "claim_controller");
      }
    } else {
      creep.travelTo(creep.room.controller);
    }
  }
}

module.exports = new ClaimControllerBehavior();
