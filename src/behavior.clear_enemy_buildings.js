const Behavior = require("./behavior.base");

class ClearEnemyBuildingsBehavior extends Behavior {
  constructor() {
    super("clear_enemy_buildings");
  }

  when(creep, rc) {
    const target = creep.room.getHostileBuildingTarget();
    return !!target;
  }

  completed(creep, rc) {
    const target = creep.getTarget();
    return !target;
  }

  work(creep, rc) {
    const target = creep.getTarget() || creep.room.getHostileBuildingTarget();

    if (target !== null) {
      creep.target = target.id;
      if (!creep.pos.isNearTo(target)) {
        creep.travelTo(target);
      } else {
        creep.dismantle(target);
      }
    }
  }
}

module.exports = new ClearEnemyBuildingsBehavior();
