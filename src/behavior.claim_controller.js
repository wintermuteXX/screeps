const Behavior = require("./behavior.base");

class ClaimControllerBehavior extends Behavior {
  constructor() {
    super("claim_controller");
  }

  when(creep, rc) {
    return creep.room.controller && !creep.room.controller.my;
  }

  completed(creep, rc) {
    return creep.room.controller.my;
  }

  work(creep, rc) {
    if (creep.pos.isNearTo(creep.room.controller)) {
      creep.claimController(creep.room.controller);
    } else {
      creep.travelTo(creep.room.controller);
    }
  }
}

module.exports = new ClaimControllerBehavior();
