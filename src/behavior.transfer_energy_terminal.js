var Behavior = require("_behavior");

var b = new Behavior("transfer_energy_terminal");

function findTerminal(rc) {
  var s = rc.room.terminal;
  console.log("Terminal: " + s);
    return s;
}

b.when = function(creep, rc) {
  if (creep.energy === 0) return false;
  var terminal = findTerminal(rc);
  return (!!terminal);
};

b.completed = function(creep, rc) {
  var terminal = creep.getTarget();

  if (creep.energy === 0) return true;
  if ( termainl && terminal.store.energy === terminal.storeCapacity ) return true;

  return false;
};

b.work = function(creep, rc) {
  var terminal = creep.getTarget();

  if (terminal === null) {
    terminal = findTerminal(rc);
    if ( terminal ) {
      creep.target = terminal.id;
    }
  }

  if (terminal) {
    if (!creep.pos.isNearTo(terminal)) {
      creep.moveToEx(terminal);
    } else {
      creep.transfer(terminal,RESOURCE_ENERGY);
    }
  }

};

module.exports = b;
