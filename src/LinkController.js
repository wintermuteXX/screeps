var RANGE_TO_SOURCE = 4;

function LinkController(rc) {
  this.room = rc;
  this.links = _.filter(rc.find(FIND_MY_STRUCTURES), function(s){
    return (s.structureType === STRUCTURE_LINK);
  });
}

Object.defineProperty(LinkController.prototype, "senders", {
  get: function() {
    var sources = this.room.getSources();
    return _.filter(this.links, function(link) {
      for (var s in sources) {
        if (link.pos.inRangeTo(sources[s], RANGE_TO_SOURCE)) {
          return true;
        }
      }
      return false;
    });
  }
});

Object.defineProperty(LinkController.prototype, "receivers", {
  get: function() {
    var sources = this.room.getSources();
    return _.filter(this.links, function(link) {
      for (var s in sources) {
        if (!link.pos.inRangeTo(sources[s], RANGE_TO_SOURCE)) {
          return true;
        }
      }
    });
  }
});

LinkController.prototype.transferEnergy = function() {
	if ( Game.time % global.getInterval("checkLinks") !== 0 ) return;

  var senders = this.senders;
  var receivers = this.receivers;

  var receiver = _.find(this.getReceivers(), function(r) {
    return (r.energy < r.energyCapacity - 100);
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

module.exports = LinkController;
