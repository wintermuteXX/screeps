function Behavior(name, when, work, completed) {
  this.name = name;
  this.when = when || function() { return false; }
  this.work = work || function() {};
  this.completed = completed || function() { return true; };
};

var behaviors = {};

function addBehavior(name, when, work, completed) {
  behaviors[name] = new Behavior(name, when, work, completed);
}

addBehavior("HARVEST",
  function(creep, rc) {
    return ( creep.energy < creep.energyCapacity );
  },
  function(creep, rc) {
      // TODO Implement HARVEST
  },
  function(creep, rc) {
    return ( creep.energy == creep.energyCapacity );
  }
);

addBehavior("HARVETS_MINER",
  function(creep, rc) {
      return true;
  },
  function(creep, rc) {

  },
  function(creep, rc) {
      return false;
  }

);

module.exports = behavior;



//
// module.exports = {
//
//   "HARVEST" : new Behavior(
//
//   ),
//
//   // "HARVETS_MINER" : new Behavior(),
//
//   "TRANSPORT_ENERGY" : new Behavior(),
//
//   "STRUCTURES_BUILD" : new Behavior(),
//
//   "STURCUTRES_REPAIR" : new Behavior(),
//
//   "UPGRADE_CONTROLLE" : new Behavior(),
//
//   "FIND_ENERGY" : new Behavior(),
//
//   "GET_ENERGY" : new Behavior(),
//
//   "GET_ENERGY_SPAWN" : new Behavior(),
//
// };
