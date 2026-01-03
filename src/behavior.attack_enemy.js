const Behavior = require("./behavior.base");

class AttackEnemyBehavior extends Behavior {
  constructor() {
    super("attack_enemy");
  }

  when(creep, rc) {
    const target = creep.room.getHostileTarget();
    return !!target;
  }

  completed(creep, rc) {
    const target = creep.getTarget();
    return !target;
  }

  work(creep, rc) {
    const target = creep.getTarget() || creep.room.getHostileTarget();

    if (target !== null) {
      creep.target = target.id;
      if (!creep.pos.isNearTo(target)) {
        creep.travelTo(target);
      } else {
        creep.attack(target);
      }
    }
  }
}

module.exports = new AttackEnemyBehavior();
