var RANGE_TO_SOURCE = 4;

function ControllerLink(rc) {
  this.room = rc;
  this.links = this.room.getLinks();
}

Object.defineProperty(ControllerLink.prototype, "senders", {
  get: function () {
    var sources = this.room.getSources();
    return _.filter(this.links, function (link) {
      return link.pos.findInRange(sources, RANGE_TO_SOURCE).length > 0;
    });
  }
});

Object.defineProperty(ControllerLink.prototype, "receivers", {
  get: function () {
    var sources = this.room.getSources();
    return _.filter(this.links, function (link) {
      return link.pos.findInRange(sources, RANGE_TO_SOURCE).length === 0;
    });
  }
});

ControllerLink.prototype.transferEnergy = function () {
  if (Game.time % global.getInterval("checkLinks") !== 0) return;

  var senders = _.filter(this.senders, function (s) {
    return (s.energy > s.energyCapacity - 100);
  });
  
  var receivers = _.shuffle(_.filter(this.receivers, function (r) {
    return (r.energy < r.energyCapacity - 200);
  }));

  if (receivers.length == 0) return;
  for (var r in receivers) {

    if (senders[0] && senders[0].cooldown === 0) {

      senders[0].transferEnergy(receivers[r]);
      senders = senders.shift();
    }
  }
};

module.exports = ControllerLink;
