var Behavior = require("_behavior");

var b = new Behavior("harvest");

function findNearLink(obj, rc) {
  var links = rc.links.senders;
  var thelink = obj.pos.findInRange(links, 1);
  if (thelink && (thelink.energy !== thelink.energyCapacity))
  return thelink;
}

b.when = function(creep, rc) {
  return (creep.energy === 0);
};

b.completed = function(creep, rc) {
  return (creep.energy === creep.energyCapacity);
};

b.work = function(creep, rc) {
  var source = creep.getTarget();

  if ( source === null ) {
    var sources = rc.getSources();
    if ( sources.length ) {
      source = sources[Math.floor(Math.random() * sources.length)];
    }
  }

  if ( source !== null ) {
    creep.target = source.id;
    if ( !creep.pos.isNearTo(source) ) {
      creep.moveToEx(source);
    } else {
      creep.harvest(source);
      var energy = findNearLink(creep, rc);
      if (energy.length) {
        console.log("Da ist ein Link in meiner Nähe :-)");
      creep.transferEnergy(energy[0]);
    }
  }

};

module.exports = b;
