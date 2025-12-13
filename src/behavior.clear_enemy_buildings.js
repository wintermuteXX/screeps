const Behavior = require("./behavior.base");

const b = new Behavior("clear_enemy_buildings");


function getTarget(room) {
  const TARGETS = [FIND_HOSTILE_SPAWNS, FIND_HOSTILE_STRUCTURES];

  const filter = function (t) {
    if (t.structureType && t.structureType === STRUCTURE_CONTROLLER) return false;
    return global.isHostileUsername(t.owner.username);
  };

  for (const i in TARGETS) {
    const targets = _.filter(room.find(TARGETS[i]), filter);
    if (targets.length) {
      return targets[Math.floor(Math.random() * targets.length)];
      // return targets[0];
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
      creep.dismantle(target);
    }
  }
};

module.exports = b;
