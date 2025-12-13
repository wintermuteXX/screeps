const Behavior = require("./behavior.base");

const b = new Behavior("attack_enemy");


function getTarget(room) {
  const TARGETS = [FIND_HOSTILE_CREEPS, FIND_HOSTILE_SPAWNS, FIND_HOSTILE_STRUCTURES];

  const filter = function (t) {
    if (t.structureType && t.structureType === STRUCTURE_CONTROLLER) return false;
    return global.isHostileUsername(t.owner.username);
  };

  for (const targetType of TARGETS) {
    const targets = _.filter(room.find(targetType), filter);
    if (targets.length) {
      return targets[0];
    }
  }

  return null;
}

b.when = function (creep, rc) {
  const target = getTarget(creep.room);
  return !!target;
};

b.completed = function (creep, rc) {
  const target = creep.getTarget();
  return !target;
};

b.work = function (creep, rc) {
  const target = creep.getTarget() || getTarget(creep.room);

  if (target !== null) {
    creep.target = target.id;
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      creep.attack(target);
    }
  }
};

module.exports = b;
