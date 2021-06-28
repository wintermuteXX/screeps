var RANGE_TO_SOURCE = 4;

function ControllerLink(rc) {
  this.room = rc;
  this.links = rc.room.links;
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
  // TODO Link should transport to most empty link OR make a better system for distributing energy to Controller OR Store
  if (Game.time % global.getFixedValue("checkLinks") !== 0) return;

  var senders = _.filter(this.senders, function (s) {
    return (s.energy > s.store.getCapacity(RESOURCE_ENERGY) - 100);
  });

  var receivers = _.shuffle(_.filter(this.receivers, function (r) {
    return (r.energy < r.store.getCapacity(RESOURCE_ENERGY) - 200);
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