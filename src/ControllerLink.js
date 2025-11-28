const CONSTANTS = require("constants");

function ControllerLink(rc) {
  this.room = rc;
  this.links = rc.room.links;
}

Object.defineProperty(ControllerLink.prototype, "senders", {
  get: function () {
    var sources = this.room.getSources();
    return _.filter(this.links, function (link) {
      return link.pos.findInRange(sources, CONSTANTS.LINK.RANGE_TO_SOURCE).length > 0;
    });
  }
});

Object.defineProperty(ControllerLink.prototype, "receivers", {
  get: function () {
    var sources = this.room.getSources();
    return _.filter(this.links, function (link) {
      return link.pos.findInRange(sources, CONSTANTS.LINK.RANGE_TO_SOURCE).length === 0;
    });
  }
});

ControllerLink.prototype.transferEnergy = function () {
  // TODO Link should transport to most empty link OR make a better system for distributing energy to Controller OR Store
  if (Game.time % global.checkLinks !== 0) return;

  var senders = _.filter(this.senders, function (s) {
    return (s.energy > s.store.getCapacity(RESOURCE_ENERGY) - CONSTANTS.STRUCTURE_ENERGY.LINK_SENDER_THRESHOLD);
  });

  var receivers = _.shuffle(_.filter(this.receivers, function (r) {
    return (r.energy < r.store.getCapacity(RESOURCE_ENERGY) - CONSTANTS.STRUCTURE_ENERGY.LINK_RECEIVER_THRESHOLD);
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