/**
 * Movement layer: screeps-cartographer with a Traveler-compatible travelTo API.
 */
const {
  moveTo,
  move,
  preTick,
  reconcileTraffic,
  config,
} = require("./lib.cartographer");

const ROLE_PRIORITY = {
  attacker: 100,
  defender: 100,
  transporter: 80,
  constructor: 55,
  upgrader: 50,
  builder: 50,
  miner: 40,
  miner_mineral: 40,
  miner_commodity: 40,
  scout: 20,
  claimer: 70,
  supporter: 60,
};

/**
 * Avoid rooms marked hostile / avoid in Memory (and refresh when we have vision).
 * @param {string} roomName
 * @returns {number|undefined}
 */
function defaultRouteCallback(roomName) {
  if (typeof Room !== "undefined" && Room.isHostile && Room.isHostile(roomName)) {
    return Infinity;
  }
  return undefined;
}

config.DEFAULT_MOVE_OPTS.routeCallback = defaultRouteCallback;

/**
 * @param {RoomPosition|{pos: RoomPosition}|RoomObject} destination
 * @returns {RoomPosition}
 */
function normalizePos(destination) {
  if (!destination) {
    return null;
  }
  if (destination instanceof RoomPosition) {
    return destination;
  }
  if (destination.pos) {
    return destination.pos;
  }
  return null;
}

/**
 * Map legacy Traveler-style options onto Cartographer MoveOpts + target range.
 * @param {Creep|PowerCreep} creep
 * @param {object} [options]
 * @returns {{ target: {pos: RoomPosition, range: number}, opts: object, fallback: object }}
 */
function mapOptions(creep, options = {}) {
  const opts = {};
  const range = options.range != null ? options.range : 1;

  if (options.maxRooms != null) {
    opts.maxRooms = options.maxRooms;
  }
  if (options.maxOps != null) {
    opts.maxOps = options.maxOps;
  }
  if (options.reusePath != null) {
    opts.reusePath = options.reusePath;
  }
  if (options.flee) {
    opts.flee = true;
  }
  if (options.visualizePathStyle) {
    opts.visualizePathStyle = options.visualizePathStyle;
  }
  if (options.priority != null) {
    opts.priority = options.priority;
  } else {
    const role = creep.memory && creep.memory.role;
    opts.priority = ROLE_PRIORITY[role] || config.DEFAULT_MOVE_OPTS.priority;
  }
  if (options.plainCost != null) {
    opts.plainCost = options.plainCost;
  }
  if (options.swampCost != null) {
    opts.swampCost = options.swampCost;
  }
  if (options.roadCost != null) {
    opts.roadCost = options.roadCost;
  }
  if (options.roomCallback) {
    opts.roomCallback = options.roomCallback;
  }
  if (options.routeCallback) {
    opts.routeCallback = options.routeCallback;
  }
  if (options.avoidCreeps != null) {
    opts.avoidCreeps = options.avoidCreeps;
  }
  if (options.repathIfStuck != null) {
    opts.repathIfStuck = options.repathIfStuck;
  }

  // Traveler: preferHighway → cheaper highway rooms (Cartographer default already favors highways)
  if (options.preferHighway) {
    opts.highwayRoomCost = options.highwayBias != null ? options.highwayBias : 1;
    opts.defaultRoomCost = 2;
  }

  // Traveler: ignoreDestructibleStructures → path through walls/obstacles
  if (options.ignoreDestructibleStructures) {
    opts.avoidObstacleStructures = false;
  }

  // Traveler: allowHostile → do not avoid hostile rooms on this move
  if (options.allowHostile) {
    opts.routeCallback = () => undefined;
  }

  // ensurePath / useFindRoute: Cartographer always uses enhanced findRoute for long range
  // ignoreConstructionSites: Cartographer only blocks obstacle construction sites by default

  const fallback = { avoidCreeps: true };
  if (options.avoidCreeps === false && options.repathIfStuck == null) {
    opts.repathIfStuck = opts.repathIfStuck != null ? opts.repathIfStuck : 3;
  }

  return { range, opts, fallback };
}

/**
 * Traveler-compatible move helper used by all behaviors.
 * @param {Creep|PowerCreep} creep
 * @param {RoomPosition|{pos: RoomPosition}|RoomObject} destination
 * @param {object} [options]
 * @returns {ScreepsReturnCode}
 */
function travelTo(creep, destination, options = {}) {
  const pos = normalizePos(destination);
  if (!pos) {
    return ERR_INVALID_ARGS;
  }

  const { range, opts, fallback } = mapOptions(creep, options);
  return moveTo(creep, { pos, range }, opts, fallback);
}

/**
 * Low-level move intent for traffic manager (e.g. exit shove).
 * @param {Creep|PowerCreep} creep
 * @param {RoomPosition|RoomPosition[]} targets
 * @param {number} [priority]
 * @returns {ScreepsReturnCode}
 */
function moveIntent(creep, targets, priority) {
  return move(creep, targets, priority);
}

Creep.prototype.travelTo = function (destination, options) {
  return travelTo(this, destination, options);
};

if (typeof PowerCreep !== "undefined") {
  PowerCreep.prototype.travelTo = Creep.prototype.travelTo;
}

module.exports = {
  travelTo,
  moveTo,
  move: moveIntent,
  preTick,
  reconcileTraffic,
  config,
  ROLE_PRIORITY,
};
