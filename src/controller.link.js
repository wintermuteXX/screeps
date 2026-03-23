const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");
const linkMemory = require("./utils.linkMemory");

class ControllerLink {
  constructor(rc) {
    this.room = rc;
    this.links = rc.room.links;
  }

  /**
   * Source-Link-IDs: Memory.rooms[room].structures.sources[id].linkID bzw. source.link (Harvest → Netzwerk).
   * @returns {Set<string>}
   */
  collectSourceLinkIds() {
    const sources = this.room.find(FIND_SOURCES);
    const sourceLinkIds = new Set();
    for (const source of sources) {
      if (!source) continue;
      if (source.memory.linkID) {
        const stored = Game.getObjectById(source.memory.linkID);
        if (stored && stored.structureType === STRUCTURE_LINK) {
          sourceLinkIds.add(source.memory.linkID);
          continue;
        }
        source.memory.linkID = null;
      }
      if (source.link) {
        sourceLinkIds.add(source.link.id);
      }
    }
    return sourceLinkIds;
  }

  /**
   * Einmal pro Klassifikation: Source-IDs, Controller-/Spawn-Link-IDs, Sources für Range-Checks.
   * @returns {{ sourceLinkIds: Set<string>, controllerLinkId: string|null, spawnLinkId: string|null, sources: Source[] }}
   */
  _getLinkContext() {
    const gameRoom = this.room.room;
    const sourceLinkIds = this.collectSourceLinkIds();
    const controllerLinkId = this._getControllerLinkId();
    const spawnLinkId = gameRoom ? linkMemory.getSpawnLinkIdForRoom(gameRoom) : null;
    const sources = gameRoom ? this.room.find(FIND_SOURCES) : [];
    return { sourceLinkIds, controllerLinkId, spawnLinkId, sources };
  }

  /**
   * Controller upgrade link id (Memory.rooms[room].structures.controller.linkID / ctrl.link).
   * @returns {string|null}
   */
  _getControllerLinkId() {
    const gameRoom = this.room.room;
    if (!gameRoom || !gameRoom.controller) {
      return null;
    }
    const ctrl = gameRoom.controller;
    if (ctrl.memory.linkID) {
      const stored = Game.getObjectById(ctrl.memory.linkID);
      if (stored && stored.structureType === STRUCTURE_LINK) {
        return ctrl.memory.linkID;
      }
      ctrl.memory.linkID = null;
    }
    if (ctrl.link) {
      return ctrl.link.id;
    }
    return null;
  }

  /**
   * Base link = Receiver in Range 3 von Storage oder Spawn, aber weder Controller- noch Spawn-/Bunker-Link.
   * Source-/Harvest-Links zählen nie als Base.
   * @param {StructureLink} link
   * @param {{ sourceLinkIds: Set<string>, controllerLinkId: string|null, spawnLinkId: string|null }} ctx
   */
  _isBaseLink(link, ctx) {
    if (!link) {
      return false;
    }
    const { sourceLinkIds, controllerLinkId, spawnLinkId } = ctx;
    if (sourceLinkIds && sourceLinkIds.has(link.id)) {
      return false;
    }
    const room = this.room.room;
    if (!room) {
      return false;
    }

    let nearCore = false;
    if (room.storage && link.pos.getRangeTo(room.storage) <= 3) {
      nearCore = true;
    }
    if (!nearCore) {
      const spawns = room.find(FIND_MY_SPAWNS);
      for (const spawn of spawns) {
        if (link.pos.getRangeTo(spawn) <= 3) {
          nearCore = true;
          break;
        }
      }
    }
    if (!nearCore) {
      return false;
    }

    if (controllerLinkId && link.id === controllerLinkId) {
      return false;
    }
    if (spawnLinkId && link.id === spawnLinkId) {
      return false;
    }

    return true;
  }

  /**
   * @param {StructureLink} link
   * @param {{ sourceLinkIds: Set<string>, controllerLinkId: string|null, spawnLinkId: string|null, sources: Source[] }} ctx
   * @returns {{ sender: boolean, receiver: boolean }}
   */
  _classifyLink(link, ctx) {
    const { sourceLinkIds, controllerLinkId, spawnLinkId, sources } = ctx;
    const isBase = this._isBaseLink(link, ctx);

    if (controllerLinkId && link.id === controllerLinkId) {
      return { sender: false, receiver: !isBase };
    }
    if (spawnLinkId && link.id === spawnLinkId) {
      return { sender: false, receiver: !isBase };
    }

    const isSourceLink = sourceLinkIds.has(link.id);
    const hasNearbySource = link.pos.findInRange(sources, CONSTANTS.LINK.RANGE_TO_SOURCE).length > 0;

    if (isSourceLink) {
      return { sender: true, receiver: false };
    }
    return {
      sender: hasNearbySource && !isBase,
      receiver: !hasNearbySource || isBase,
    };
  }

  /**
   * Sender/Empfänger in einem Durchlauf; Kontext pro Tick gecacht.
   * @returns {{ senders: StructureLink[], receivers: StructureLink[], ctx: object }}
   */
  _ensureClassified() {
    if (this._linkClassifyTick !== Game.time) {
      this._linkClassifyTick = Game.time;
      const ctx = this._getLinkContext();
      const list = this.links || [];
      const senders = [];
      const receivers = [];
      for (const link of list) {
        const { sender, receiver } = this._classifyLink(link, ctx);
        if (sender) senders.push(link);
        if (receiver) receivers.push(link);
      }
      this._linkClassified = { senders, receivers, ctx };
    }
    return this._linkClassified;
  }

  get senders() {
    return this._ensureClassified().senders;
  }

  get receivers() {
    return this._ensureClassified().receivers;
  }

  /**
   * @param {StructureLink} link
   * @param {{ spawnLinkId: string|null }} ctx
   * @returns {boolean}
   */
  _isSpawnLink(link, ctx) {
    return !!(link && ctx.spawnLinkId && link.id === ctx.spawnLinkId);
  }

  /**
   * @param {StructureLink} link
   * @returns {boolean}
   */
  _isControllerLink(link) {
    if (!link || !this.room.room.controller) {
      return false;
    }
    const ctrl = this.room.room.controller;
    if (ctrl.memory.linkID && link.id === ctrl.memory.linkID) {
      return true;
    }
    if (ctrl.link && link.id === ctrl.link.id) {
      return true;
    }
    return link.pos.getRangeTo(ctrl) <= 3;
  }

  _isSenderReady(sender) {
    if (!sender || sender.cooldown > 0) {
      return false;
    }
    const capacity = sender.store.getCapacity(RESOURCE_ENERGY);
    return sender.energy > capacity - CONSTANTS.STRUCTURE_ENERGY.LINK_SENDER_THRESHOLD;
  }

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
    if (!this.room || !this.room.room) {
      return;
    }

    const { senders, receivers, ctx } = this._ensureClassified();
    const readySenders = _.filter(senders, (s) => this._isSenderReady(s));
    let needingReceivers = _.filter(receivers, (r) => this._isReceiverNeedingEnergy(r));
    const storage = this.room.room.storage;
    const storageEnergyThreshold =
      global.fillLevel && global.fillLevel[RESOURCE_ENERGY]
        ? global.fillLevel[RESOURCE_ENERGY].storage
        : 30000;

    const shouldPreferBaseLink =
      storage && storage.store && storage.store.getUsedCapacity(RESOURCE_ENERGY) < storageEnergyThreshold;

    const spawnId = ctx.spawnLinkId;
    if (shouldPreferBaseLink && needingReceivers.length > 0) {
      const baseLinks = _.shuffle(needingReceivers.filter((r) => this._isBaseLink(r, ctx)));
      const spawnLinks = spawnId
        ? _.shuffle(needingReceivers.filter((r) => r.id === spawnId))
        : [];
      const controllerLinks = _.shuffle(
        needingReceivers.filter(
          (r) =>
            this._isControllerLink(r) &&
            !this._isBaseLink(r, ctx) &&
            !this._isSpawnLink(r, ctx),
        ),
      );
      const otherLinks = _.shuffle(
        needingReceivers.filter(
          (r) =>
            !this._isBaseLink(r, ctx) &&
            !this._isControllerLink(r) &&
            !this._isSpawnLink(r, ctx),
        ),
      );

      needingReceivers = [...baseLinks, ...spawnLinks, ...controllerLinks, ...otherLinks];
    } else if (spawnId && needingReceivers.length > 0) {
      const spawnFirst = needingReceivers.filter((r) => r.id === spawnId);
      const rest = _.shuffle(needingReceivers.filter((r) => r.id !== spawnId));
      needingReceivers = [...spawnFirst, ...rest];
    } else {
      needingReceivers = _.shuffle(needingReceivers);
    }

    if (Log.getLogLevel("link") <= Log.LEVEL_DEBUG) {
      const roomName = this.room.room.name;
      const spawnInReceivers = spawnId && receivers.some((r) => r.id === spawnId);
      const spawnNeeding = spawnId && needingReceivers.some((r) => r.id === spawnId);
      Log.debug(
        `${roomName} spawnLinkId=${spawnId || "null"} spawnInReceivers=${spawnInReceivers} spawnNeeding=${spawnNeeding} readySenders=${readySenders.length} preferBase=${shouldPreferBaseLink}`,
        "link",
      );
    }

    if (readySenders.length === 0 || needingReceivers.length === 0) {
      return;
    }

    for (const receiver of needingReceivers) {
      if (readySenders.length === 0) {
        break;
      }

      const sender = readySenders[0];
      if (this._isSenderReady(sender)) {
        const result = sender.transferEnergy(receiver);
        if (result === OK) {
          readySenders.shift();
        }
      }
    }
  }
}

module.exports = ControllerLink;
