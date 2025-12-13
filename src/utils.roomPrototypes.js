/**
 * Room Structure Prototypes
 * Provides cached access to room structures via prototype extensions
 */

// Cache for room structures (module-level, shared across all rooms)
const roomStructures = {};
const roomStructuresExpiration = {};
const CACHE_TIMEOUT = 50;
const CACHE_OFFSET = 4;

const multipleList = [
  STRUCTURE_SPAWN,
  STRUCTURE_EXTENSION,
  STRUCTURE_ROAD,
  STRUCTURE_WALL,
  STRUCTURE_RAMPART,
  STRUCTURE_KEEPER_LAIR,
  STRUCTURE_PORTAL,
  STRUCTURE_LINK,
  STRUCTURE_TOWER,
  STRUCTURE_LAB,
  STRUCTURE_CONTAINER,
  STRUCTURE_POWER_BANK,
];

const singleList = [STRUCTURE_OBSERVER, STRUCTURE_POWER_SPAWN, STRUCTURE_EXTRACTOR, STRUCTURE_NUKER, STRUCTURE_FACTORY];
//STRUCTURE_TERMINAL,   STRUCTURE_CONTROLLER,   STRUCTURE_STORAGE,

function getCacheExpiration() {
  return CACHE_TIMEOUT + Math.round(Math.random() * CACHE_OFFSET * 2 - CACHE_OFFSET);
}

Room.prototype._checkRoomCache = function _checkRoomCache() {
  // if cache is expired or doesn't exist
  if (!roomStructuresExpiration[this.name] || !roomStructures[this.name] || roomStructuresExpiration[this.name] < Game.time) {
    roomStructuresExpiration[this.name] = Game.time + getCacheExpiration();
    const structures = this.find(FIND_STRUCTURES);
    roomStructures[this.name] = _.groupBy(structures, (s) => {
      return /** @type {Structure} */ (s).structureType;
    });
    for (const type in roomStructures[this.name]) {
      roomStructures[this.name][type] = _.map(roomStructures[this.name][type], (s) => s.id);
    }
  }
};

multipleList.forEach((type) => {
  Object.defineProperty(Room.prototype, `${type  }s`, {
    get: function () {
      if (this[`_${  type  }s`] && this[`_${  type  }s_ts`] === Game.time) {
        return this[`_${  type  }s`];
      } else {
        this._checkRoomCache();
        // Check if structure type exists and has structures
        if (roomStructures[this.name] && roomStructures[this.name][type] && roomStructures[this.name][type].length > 0) {
          this[`_${  type  }s_ts`] = Game.time;
          // Filter out null/undefined in case structures were destroyed
          return (this[`_${  type  }s`] = roomStructures[this.name][type]
            .map(Game.getObjectById)
            .filter(s => s !== null && s !== undefined));
        } else {
          this[`_${  type  }s_ts`] = Game.time;
          return (this[`_${  type  }s`] = []);
        }
      }
    },
    set: function () {},
    enumerable: false,
    configurable: true,
  });
});

singleList.forEach((type) => {
  Object.defineProperty(Room.prototype, type, {
    get: function () {
      if (this[`_${  type}`] && this[`_${  type  }_ts`] === Game.time) {
        return this[`_${  type}`];
      } else {
        this._checkRoomCache();
        // Check if structure type exists and has at least one structure
        if (roomStructures[this.name] && roomStructures[this.name][type] && roomStructures[this.name][type].length > 0) {
          this[`_${  type  }_ts`] = Game.time;
          return (this[`_${  type}`] = Game.getObjectById(roomStructures[this.name][type][0]));
        } else {
          this[`_${  type  }_ts`] = Game.time;
          return (this[`_${  type}`] = undefined);
        }
      }
    },
    set: function () {},
    enumerable: false,
    configurable: true,
  });
});

// Module exports nothing - this file only extends prototypes
module.exports = {};

