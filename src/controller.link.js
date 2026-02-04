const CONSTANTS = require("./config.constants");

class ControllerLink {
  constructor(rc) {
    this.room = rc;
    this.links = rc.room.links;
  }

  /**
   * Helper function to get links near sources (senders) or links that receive energy (receivers).
   * Base links are always receivers so they get supplied even when in range of a source.
   * @param {boolean} nearSource - If true, returns sender links (near source, not base link), otherwise receivers
   * @returns {StructureLink[]} Array of links
   */
  _getLinksBySourceProximity(nearSource) {
    const sources = this.room.find(FIND_SOURCES);
    return _.filter(this.links, (link) => {
      const hasNearbySource = link.pos.findInRange(sources, CONSTANTS.LINK.RANGE_TO_SOURCE).length > 0;
      const isBase = this._isBaseLink(link);
      if (nearSource) {
        // Sender: near source and not a base link (base links are supplied, they don't send from source)
        return hasNearbySource && !isBase;
      }
      // Receiver: not near source, or base link (base link is always supplied)
      return !hasNearbySource || isBase;
    });
  }

  get senders() {
    return this._getLinksBySourceProximity(true);
  }

  get receivers() {
    return this._getLinksBySourceProximity(false);
  }

  /**
   * Helper function to check if a link is a controller link (close to controller)
   * @param {StructureLink} link - The link to check
   * @returns {boolean} True if it's a controller link
   */
  _isControllerLink(link) {
    if (!link || !this.room.room.controller) {
      return false;
    }
    // Controller link should be within range 3 of the controller
    return link.pos.getRangeTo(this.room.room.controller) <= 3;
  }

  /**
   * Helper function to check if a link is a base link (close to storage/spawn)
   * @param {StructureLink} link - The link to check
   * @returns {boolean} True if it's a base link
   */
  _isBaseLink(link) {
    if (!link) {
      return false;
    }
    const room = this.room.room;
    
    // Check if link is close to storage
    if (room.storage && link.pos.getRangeTo(room.storage) <= 3) {
      return true;
    }
    
    // Check if link is close to spawns
    const spawns = room.find(FIND_MY_SPAWNS);
    for (const spawn of spawns) {
      if (link.pos.getRangeTo(spawn) <= 3) {
        return true;
      }
    }
    
    return false;
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
    if (Game.time % CONSTANTS.TICKS.CHECK_LINKS !== 0) {
      return;
    }

    // Get ready senders (filtered and ready to transfer)
    const readySenders = _.filter(this.senders, (s) => this._isSenderReady(s));

    // Get receivers that need energy
    let needingReceivers = _.filter(this.receivers, (r) => this._isReceiverNeedingEnergy(r));

    // Check if storage exists and has less than 30000 energy (from fillLevelConfig)
    const storage = this.room.room.storage;
    const storageEnergyThreshold = global.fillLevel && global.fillLevel[RESOURCE_ENERGY] 
      ? global.fillLevel[RESOURCE_ENERGY].storage 
      : 30000; // Fallback to 30000 if fillLevel not available
    
    const shouldPreferBaseLink = storage && storage.store && 
      storage.store.getUsedCapacity(RESOURCE_ENERGY) < storageEnergyThreshold;

    // Sort receivers: prefer base link over controller link when storage is low
    if (shouldPreferBaseLink && needingReceivers.length > 1) {
      // Separate receivers into priority groups and shuffle within each group
      const baseLinks = _.shuffle(needingReceivers.filter(r => this._isBaseLink(r)));
      const controllerLinks = _.shuffle(needingReceivers.filter(r => this._isControllerLink(r)));
      const otherLinks = _.shuffle(needingReceivers.filter(r => !this._isBaseLink(r) && !this._isControllerLink(r)));
      
      // Base links first, then controller links, then others
      needingReceivers = [...baseLinks, ...controllerLinks, ...otherLinks];
    } else {
      // Normal random distribution when storage is fine
      needingReceivers = _.shuffle(needingReceivers);
    }

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
