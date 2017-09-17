var Behavior = require("_behavior");
var b = new Behavior("get_resources");

b.when = function (creep, rc) {
  if (creep.room.memory.droppedResources.length === 0) return false;
  if (creep.energy > 0) return false;
  return true;
};

b.completed = function (creep, rc) {
  return (creep.energy > 0);
};

b.work = function (creep, rc) {
  var target = creep.getTarget();

  if (!target) {
    if (creep.room.memory.droppedResources[0]) {
      creep.target = creep.room.memory.droppedResources[0].id;
    }
    else { console.log("Error: No dropped Resource"); }
  }

  if (target) {
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      console.log("Get: " + target);
      // creep.withdraw(target, RESOURCE_ENERGY);
    }
  }

};
module.exports = b;
