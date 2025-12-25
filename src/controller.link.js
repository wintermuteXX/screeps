const CONSTANTS = require("./config.constants");

class ControllerLink {
  constructor(rc) {
    this.room = rc;
    this.links = rc.room.links;
  }

  /**
   * Helper function to get links near sources (senders) or away from sources (receivers)
   * @param {boolean} nearSource - If true, returns links near sources (senders), otherwise receivers
   * @returns {StructureLink[]} Array of links
   */
  _getLinksBySourceProximity(nearSource) {
    // Nutzt gecachten find() Cache statt getSources()
    const sources = this.room.find(FIND_SOURCES);
    return _.filter(this.links, (link) => {
      const hasNearbySource = link.pos.findInRange(sources, CONSTANTS.LINK.RANGE_TO_SOURCE).length > 0;
      return nearSource ? hasNearbySource : !hasNearbySource;
    });
  }

  get senders() {
    return this._getLinksBySourceProximity(true);
  }

  get receivers() {
    return this._getLinksBySourceProximity(false);
  }

  /**
   * Helper function to check if a sender link is ready to send energy
   * @param {StructureLink} sender - The sender link
   * @returns {boolean} True if ready to send
   */
  _isSenderReady(sender) {
    if (!sender || sender.cooldown > 0) {
      return false;
    }
    const capacity = sender.store.getCapacity(RESOURCE_ENERGY);
    return sender.energy > capacity - CONSTANTS.STRUCTURE_ENERGY.LINK_SENDER_THRESHOLD;
  }

  /**
   * Helper function to check if a receiver link needs energy
   * @param {StructureLink} receiver - The receiver link
   * @returns {boolean} True if needs energy
   */
  _isReceiverNeedingEnergy(receiver) {
    if (!receiver) {
      return false;
    }
    const capacity = receiver.store.getCapacity(RESOURCE_ENERGY);
    return receiver.energy < capacity - CONSTANTS.STRUCTURE_ENERGY.LINK_RECEIVER_THRESHOLD;
  }

  transferEnergy() {
    // TODO Link should transport to most empty link OR make a better system for distributing energy to Controller OR Store
    if (Game.time % CONSTANTS.TICKS.CHECK_LINKS !== 0) {
      return;
    }

    // Get ready senders (filtered and ready to transfer)
    const readySenders = _.filter(this.senders, (s) => this._isSenderReady(s));

    // Get receivers that need energy (shuffled for better distribution)
    const needingReceivers = _.shuffle(_.filter(this.receivers, (r) => this._isReceiverNeedingEnergy(r)));

    // Early return if no work to do
    if (readySenders.length === 0 || needingReceivers.length === 0) {
      return;
    }

    // Transfer energy from ready senders to needing receivers
    for (const receiver of needingReceivers) {
      if (readySenders.length === 0) {
        break; // No more senders available
      }

      const sender = readySenders[0];
      if (this._isSenderReady(sender)) {
        sender.transferEnergy(receiver);
        readySenders.shift(); // Remove used sender from array
      }
    }
  }
}

module.exports = ControllerLink;
