var Behavior = require("_behavior");

var b = new Behavior("transfer_resources_terminal");

function findTerminal(rc) {
  var s = rc.room.terminal;
  return s;
}

b.when = function (creep, rc) {
  if (creep.energy === 0) return false;
  var terminal = findTerminal(rc);
  return (!!terminal);
};

b.completed = function (creep, rc) {
  var terminal = creep.getTarget();

  if (creep.energy === 0) return true;
  if (terminal && terminal.store.energy === terminal.storeCapacity) return true;

  return false;
};

b.work = function (creep, rc) {
  var terminal = creep.getTarget();

  if (terminal === null) {
    terminal = findTerminal(rc);
    if (terminal) {
      creep.target = terminal.id;
    }
  }

  if (terminal) {

    let result = creep.transferAllResources(terminal);

    switch (result) {
      case OK:
      case ERR_NOT_ENOUGH_RESOURCES:
        creep.memory.resourceType = null;
      case ERR_FULL:
        creep.target = null;
        creep.memory.structure = null;
        break;
      case ERR_NOT_IN_RANGE:
        creep.travelTo(terminal);
        break;

      default:
        console.log(`unknown result from (creep ${creep}).transfer(${terminal}): ${result}`);
    }

  }

};

module.exports = b;