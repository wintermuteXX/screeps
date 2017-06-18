var RANGE_TO_SOURCE = 4;

function ControllerLink(rc) {
  this.room = rc;
  this.links = _.filter(rc.find(FIND_MY_STRUCTURES), function(s){
    return (s.structureType === STRUCTURE_LINK);
  });
}

Object.defineProperty(ControllerLink.prototype, "senders", {
  get: function() {
    var sources = this.room.getSources();
    return _.filter(this.links, function(link) {
      return link.pos.findInRange(sources, RANGE_TO_SOURCE).length > 0;
    });
  }
});

Object.defineProperty(ControllerLink.prototype, "receivers", {
  get: function() {
    var sources = this.room.getSources();
    return _.filter(this.links, function(link) {
      return link.pos.findInRange(sources, RANGE_TO_SOURCE).length === 0;
    });
  }
});

ControllerLink.prototype.transferEnergy = function() {
  if ( Game.time % global.getInterval("checkLinks") !== 0 ) return;

  var senders = this.senders;
  var receivers = this.receivers;

  var receiver = _.find(receivers, function(r) {
    return (r.energy < r.energyCapacity - 200);
  });

  if (receiver !== null) {
    for (var s in senders) {
      var sender = senders[s];
      if (sender.cooldown === 0 && sender.energy === sender.energyCapacity) {
        sender.transferEnergy(receiver);
      }
    }
  }
};

module.exports = ControllerLink;
