const CONSTANTS = require("./config.constants");

class ControllerLink {
  constructor(rc) {
    this.room = rc;
    this.links = rc.room.links;
  }

  get senders() {
    // Nutzt gecachten find() Cache statt getSources()
    const sources = this.room.find(FIND_SOURCES);
    return _.filter(this.links, function (link) {
      return link.pos.findInRange(sources, CONSTANTS.LINK.RANGE_TO_SOURCE).length > 0;
    });
  }

  get receivers() {
    // Nutzt gecachten find() Cache statt getSources()
    const sources = this.room.find(FIND_SOURCES);
    return _.filter(this.links, function (link) {
      return link.pos.findInRange(sources, CONSTANTS.LINK.RANGE_TO_SOURCE).length === 0;
    });
  }

  transferEnergy() {
    // TODO Link should transport to most empty link OR make a better system for distributing energy to Controller OR Store
    if (Game.time % CONSTANTS.TICKS.CHECK_LINKS !== 0) {
      return;
    }

    let senders = _.filter(this.senders, function (s) {
      return (s.energy > s.store.getCapacity(RESOURCE_ENERGY) - CONSTANTS.STRUCTURE_ENERGY.LINK_SENDER_THRESHOLD);
    });

    const receivers = _.shuffle(_.filter(this.receivers, function (r) {
      return (r.energy < r.store.getCapacity(RESOURCE_ENERGY) - CONSTANTS.STRUCTURE_ENERGY.LINK_RECEIVER_THRESHOLD);
    }));

    if (receivers.length === 0) {
      return;
    }
    for (const r in receivers) {
      if (senders[0] && senders[0].cooldown === 0) {
        senders[0].transferEnergy(receivers[r]);
        senders = senders.shift();
      }
    }
  }
}

module.exports = ControllerLink;
