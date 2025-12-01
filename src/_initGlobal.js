const Log = require("Log");
const CONSTANTS = require("./constants");

function initGlobal(g) {
  // ===== Username Utilities =====
  // Cache for own username (per tick)
  let cachedUsername = null;
  let cachedUsernameTick = null;

  /**
   * Get the current player's username (cached per tick)
   * @returns {string|null} The username or null if not available
   */
  g.getMyUsername = function() {
    if (cachedUsername && cachedUsernameTick === Game.time) {
      return cachedUsername;
    }

    // Try to get from spawns first
    const spawns = Object.keys(Game.spawns);
    if (spawns.length > 0) {
      cachedUsername = Game.spawns[spawns[0]].owner.username;
      cachedUsernameTick = Game.time;
      return cachedUsername;
    }

    // Fallback: try structures
    const structures = Object.keys(Game.structures);
    if (structures.length > 0) {
      cachedUsername = Game.structures[structures[0]].owner.username;
      cachedUsernameTick = Game.time;
      return cachedUsername;
    }

    return null;
  };

  /**
   * Check if a username is hostile (not own and not Source Keeper)
   * @param {string} username - The username to check
   * @returns {boolean} True if hostile
   */
  g.isHostileUsername = function(username) {
    if (!username) return false;
    const myUsername = g.getMyUsername();
    return username !== myUsername && username !== 'Source Keeper';
  };

  // ===== Room Analysis =====
  /**
   * Analyse a room and store comprehensive data in memory
   * Can be called from ControllerRoom or Scout
   * @param {Room} room - The room to analyse
   * @param {boolean} fullAnalysis - If true, performs full analysis including dynamic data (default: false)
   */
  g.analyzeRoom = function (room, fullAnalysis = false) {
    if (!room || !room.memory) return;
    
    const memory = room.memory;
    
    try {
      memory.lastCheck = Game.time;

      // ===== Static Data (only set once) =====
      if (!memory.roomType) {
        // Source keeper rooms
        let lairs = room.find(FIND_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_KEEPER_LAIR
        });
        if (lairs.length > 0) {
          memory.roomType = "ROOMTYPE_SOURCEKEEPER";
          memory.keeperLairs = lairs.length;
          return;
        }

        // Core rooms (3 sources)
        let sources = room.find(FIND_SOURCES);
        if (sources.length === CONSTANTS.ROOM.SOURCE_COUNT_CORE) {
          memory.roomType = "ROOMTYPE_CORE";
        } else if (room.controller) {
          memory.roomType = "ROOMTYPE_CONTROLLER";
        } else {
          memory.roomType = "ROOMTYPE_ALLEY";
        }

        // Source information (static)
        memory.sources = sources.map(s => ({
          id: s.id,
          x: s.pos.x,
          y: s.pos.y,
        }));
        memory.sourceCount = sources.length;

        // Mineral information (static)
        if (room.mineral) {
          memory.mineral = {
            type: room.mineral.mineralType,
            x: room.mineral.pos.x,
            y: room.mineral.pos.y,
            id: room.mineral.id,
          };
        }

        // Portal information (static)
        let portals = room.find(FIND_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_PORTAL
        });
        if (portals.length > 0) {
          memory.portal = {
            id: portals[0].id,
            x: portals[0].pos.x,
            y: portals[0].pos.y,
            destination: portals[0].destination ? {
              room: portals[0].destination.room,
              shard: portals[0].destination.shard,
            } : null,
          };
        }

        // Power Bank information (static)
        let powerBanks = room.find(FIND_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_POWER_BANK
        });
        if (powerBanks.length > 0) {
          memory.powerBank = {
            id: powerBanks[0].id,
            x: powerBanks[0].pos.x,
            y: powerBanks[0].pos.y,
            power: powerBanks[0].power,
          };
        }

        // Deposit information (static)
        let deposits = room.find(FIND_DEPOSITS);
        if (deposits.length > 0) {
          memory.deposits = deposits.map(d => ({
            id: d.id,
            x: d.pos.x,
            y: d.pos.y,
            type: d.depositType,
            cooldown: d.cooldown,
          }));
        }
      }

      // ===== Dynamic Data (updated on full analysis) =====
      if (fullAnalysis) {
        // Controller information
        if (room.controller) {
          memory.controller = {
            level: room.controller.level,
            progress: room.controller.progress,
            progressTotal: room.controller.progressTotal,
            owner: room.controller.owner ? room.controller.owner.username : null,
            reservation: room.controller.reservation ? {
              username: room.controller.reservation.username,
              ticksToEnd: room.controller.reservation.ticksToEnd,
            } : null,
            upgradeBlocked: room.controller.upgradeBlocked,
            my: room.controller.my,
          };
        }

        // Important structures
        memory.structures = {
          spawn: room.find(FIND_MY_SPAWNS).length,
          extension: room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_EXTENSION
          }).length,
          storage: room.storage ? { id: room.storage.id, x: room.storage.pos.x, y: room.storage.pos.y } : null,
          terminal: room.terminal ? { id: room.terminal.id, x: room.terminal.pos.x, y: room.terminal.pos.y } : null,
          factory: room.factory ? { id: room.factory.id, x: room.factory.pos.x, y: room.factory.pos.y } : null,
          tower: room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_TOWER
          }).length,
          link: room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_LINK
          }).length,
          lab: room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_LAB
          }).length,
          nuker: room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_NUKER
          }).length,
          observer: room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_OBSERVER
          }).length,
          powerSpawn: room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_POWER_SPAWN
          }).length,
        };

        // Hostile information
        let hostiles = room.find(FIND_HOSTILE_CREEPS);
        let hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
        memory.hostiles = {
          creeps: hostiles.length,
          structures: hostileStructures.length,
          usernames: hostiles.map(c => c.owner.username).filter((v, i, a) => a.indexOf(v) === i), // unique usernames
        };

        // Invader cores
        let invaderCores = room.find(FIND_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
        });
        if (invaderCores.length > 0) {
          memory.invaderCores = invaderCores.map(c => ({
            id: c.id,
            x: c.pos.x,
            y: c.pos.y,
            level: c.level,
            ticksToDeploy: c.ticksToDeploy,
          }));
        }

        // Energy available
        memory.energy = {
          available: room.energyAvailable,
          capacity: room.energyCapacityAvailable,
        };
      }

      // Log summary of analysis
      logAnalysisSummary(room, memory, fullAnalysis);
    } catch (e) {
      Log.error(e, "analyzeRoom");
    }
  };

  /**
   * Logs a summary of room analysis
   * @param {Room} room - The analyzed room
   * @param {Object} memory - The room's memory
   * @param {boolean} fullAnalysis - Whether full analysis was performed
   */
  function logAnalysisSummary(room, memory, fullAnalysis) {
    const parts = [];
    
    // Room type
    parts.push(`Type: ${memory.roomType}`);
    
    // Sources
    if (memory.sourceCount !== undefined) {
      parts.push(`Sources: ${memory.sourceCount}`);
    }
    
    // Mineral
    if (memory.mineral) {
      // Use global.resourceImg if available, otherwise just use the type string
      const resourceImg = typeof global !== 'undefined' && global.resourceImg 
        ? global.resourceImg(memory.mineral.type) 
        : memory.mineral.type;
      parts.push(`Mineral: ${resourceImg}`);
    }
    
    // Controller info (if full analysis)
    if (fullAnalysis && memory.controller) {
      if (memory.controller.my) {
        parts.push(`Controller: RCL${memory.controller.level} (OWNED)`);
      } else if (memory.controller.owner) {
        parts.push(`Controller: RCL${memory.controller.level} (${memory.controller.owner})`);
      } else if (memory.controller.reservation) {
        parts.push(`Controller: Reserved by ${memory.controller.reservation.username}`);
      } else {
        parts.push(`Controller: RCL${memory.controller.level} (Available)`);
      }
    }
    
    // Hostiles (if full analysis)
    if (fullAnalysis && memory.hostiles) {
      if (memory.hostiles.creeps > 0 || memory.hostiles.structures > 0) {
        const hostileInfo = [];
        if (memory.hostiles.creeps > 0) {
          hostileInfo.push(`${memory.hostiles.creeps} creeps`);
        }
        if (memory.hostiles.structures > 0) {
          hostileInfo.push(`${memory.hostiles.structures} structures`);
        }
        if (memory.hostiles.usernames && memory.hostiles.usernames.length > 0) {
          hostileInfo.push(`(${memory.hostiles.usernames.join(', ')})`);
        }
        parts.push(`⚠️ Hostiles: ${hostileInfo.join(' ')}`);
      }
    }
    
    // Special features
    if (memory.portal) {
      const dest = memory.portal.destination;
      if (dest) {
        parts.push(`Portal → ${dest.room}${dest.shard ? ` (${dest.shard})` : ''}`);
      } else {
        parts.push(`Portal (unknown destination)`);
      }
    }
    if (memory.powerBank) {
      parts.push(`Power Bank: ${memory.powerBank.power} power`);
    }
    if (memory.deposits && memory.deposits.length > 0) {
      parts.push(`Deposits: ${memory.deposits.length}`);
    }
    if (memory.keeperLairs) {
      parts.push(`Keeper Lairs: ${memory.keeperLairs}`);
    }
    
    // Structures (if full analysis and own room)
    if (fullAnalysis && memory.structures && memory.controller && memory.controller.my) {
      const structParts = [];
      if (memory.structures.spawn > 0) structParts.push(`${memory.structures.spawn}S`);
      if (memory.structures.tower > 0) structParts.push(`${memory.structures.tower}T`);
      if (memory.structures.storage) structParts.push('Storage');
      if (memory.structures.terminal) structParts.push('Terminal');
      if (memory.structures.factory) structParts.push('Factory');
      if (structParts.length > 0) {
        parts.push(`Structures: ${structParts.join(', ')}`);
      }
    }
    
    const summary = `📊 ${room.name}: ${parts.join(' | ')}`;
    Log.success(summary, "analyzeRoom");
  }

  // Prototypes for Room Structures
  var roomStructures = {};
  var roomStructuresExpiration = {};
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

  /********* CPU Profiling stats for Room.prototype._checkRoomCache ********** 
  calls         time      avg        function
  550106        5581.762  0.01015    Room._checkRoomCache
  calls with cache reset: 4085
  avg for cache reset:    0.137165
  calls without reset:    270968
  avg without reset:      0.003262
  ****************************************************************************/
  Room.prototype._checkRoomCache = function _checkRoomCache() {
    // if cache is expired or doesn't exist
    if (!roomStructuresExpiration[this.name] || !roomStructures[this.name] || roomStructuresExpiration[this.name] < Game.time) {
      roomStructuresExpiration[this.name] = Game.time + getCacheExpiration();
      var structures = this.find(FIND_STRUCTURES);
      roomStructures[this.name] = _.groupBy(structures, (s) => {
        return /** @type {Structure} */ (s).structureType;
      });
      var i;
      for (i in roomStructures[this.name]) {
        roomStructures[this.name][i] = _.map(roomStructures[this.name][i], (s) => s.id);
      }
    }
  };
  multipleList.forEach(function (type) {
    Object.defineProperty(Room.prototype, type + "s", {
      get: function () {
        if (this["_" + type + "s"] && this["_" + type + "s_ts"] === Game.time) {
          return this["_" + type + "s"];
        } else {
          this._checkRoomCache();
          // Check if structure type exists and has structures
          if (roomStructures[this.name] && roomStructures[this.name][type] && roomStructures[this.name][type].length > 0) {
            this["_" + type + "s_ts"] = Game.time;
            // Filter out null/undefined in case structures were destroyed
            return (this["_" + type + "s"] = roomStructures[this.name][type]
              .map(Game.getObjectById)
              .filter(s => s !== null && s !== undefined));
          } else {
            this["_" + type + "s_ts"] = Game.time;
            return (this["_" + type + "s"] = []);
          }
        }
      },
      set: function () {},
      enumerable: false,
      configurable: true,
    });
  });
  singleList.forEach(function (type) {
    Object.defineProperty(Room.prototype, type, {
      get: function () {
        if (this["_" + type] && this["_" + type + "_ts"] === Game.time) {
          return this["_" + type];
        } else {
          this._checkRoomCache();
          // Check if structure type exists and has at least one structure
          if (roomStructures[this.name] && roomStructures[this.name][type] && roomStructures[this.name][type].length > 0) {
            this["_" + type + "_ts"] = Game.time;
            return (this["_" + type] = Game.getObjectById(roomStructures[this.name][type][0]));
          } else {
            this["_" + type + "_ts"] = Game.time;
            return (this["_" + type] = undefined);
          }
        }
      },
      set: function () {},
      enumerable: false,
      configurable: true,
    });
  });
  // End Room Structures Prototypes

  g.killAll = function () {
    for (var c in Game.creeps) {
      Game.creeps[c].suicide();
    }
  };

  // Constants are now imported directly in each file that needs them
  // No need to assign them to global anymore
  // Resources - fillLevel is too large to move to constants.js, keeping it here
  // Helper function to create fill level entries
  const fillLevel = (storage, terminal = 0, factory = 0, extras = {}) => ({
    storage,
    terminal,
    factory,
    ...extras,
  });

  // Common fill level patterns
  const BASE_RESOURCE = fillLevel(21000, 0, 2000); // Base resources (H, O, U, L, K, Z, catalyst, ghodium)
  const COMMODITY = fillLevel(5000, 0, 2000); // Commodities (silicon, metal, biomass, mist)
  const INTERMEDIATE = fillLevel(9000, 0, 0); // Intermediate compounds
  const CATALYZED = fillLevel(21000, 0, 0); // Catalyzed resources
  const BAR = fillLevel(5000, 0, 1000); // Bars and related
  const NO_STORAGE = fillLevel(0, 0, 0); // No storage (many end products)
  const SMALL_STORAGE = fillLevel(1000, 0, 0); // Small storage base (composite, crystal, liquid)

  global.fillLevel = {
    [RESOURCE_ENERGY]: fillLevel(30000, 50000, 5000),
    [RESOURCE_POWER]: fillLevel(5000, 0, 0),
    [RESOURCE_HYDROGEN]: BASE_RESOURCE,
    [RESOURCE_OXYGEN]: BASE_RESOURCE,
    [RESOURCE_UTRIUM]: BASE_RESOURCE,
    [RESOURCE_LEMERGIUM]: BASE_RESOURCE,
    [RESOURCE_KEANIUM]: BASE_RESOURCE,
    [RESOURCE_ZYNTHIUM]: BASE_RESOURCE,
    [RESOURCE_CATALYST]: BASE_RESOURCE,
    [RESOURCE_GHODIUM]: BASE_RESOURCE,
    [RESOURCE_SILICON]: COMMODITY,
    [RESOURCE_METAL]: COMMODITY,
    [RESOURCE_BIOMASS]: COMMODITY,
    [RESOURCE_MIST]: COMMODITY,
    [RESOURCE_HYDROXIDE]: CATALYZED,
    [RESOURCE_ZYNTHIUM_KEANITE]: INTERMEDIATE,
    [RESOURCE_UTRIUM_LEMERGITE]: INTERMEDIATE,
    [RESOURCE_UTRIUM_HYDRIDE]: INTERMEDIATE,
    [RESOURCE_UTRIUM_OXIDE]: INTERMEDIATE,
    [RESOURCE_KEANIUM_HYDRIDE]: INTERMEDIATE,
    [RESOURCE_KEANIUM_OXIDE]: INTERMEDIATE,
    [RESOURCE_LEMERGIUM_HYDRIDE]: INTERMEDIATE,
    [RESOURCE_LEMERGIUM_OXIDE]: INTERMEDIATE,
    [RESOURCE_ZYNTHIUM_HYDRIDE]: INTERMEDIATE,
    [RESOURCE_ZYNTHIUM_OXIDE]: INTERMEDIATE,
    [RESOURCE_GHODIUM_HYDRIDE]: INTERMEDIATE,
    [RESOURCE_GHODIUM_OXIDE]: INTERMEDIATE,
    [RESOURCE_UTRIUM_ACID]: INTERMEDIATE,
    [RESOURCE_UTRIUM_ALKALIDE]: INTERMEDIATE,
    [RESOURCE_KEANIUM_ACID]: INTERMEDIATE,
    [RESOURCE_KEANIUM_ALKALIDE]: INTERMEDIATE,
    [RESOURCE_LEMERGIUM_ACID]: INTERMEDIATE,
    [RESOURCE_LEMERGIUM_ALKALIDE]: INTERMEDIATE,
    [RESOURCE_ZYNTHIUM_ACID]: INTERMEDIATE,
    [RESOURCE_ZYNTHIUM_ALKALIDE]: INTERMEDIATE,
    [RESOURCE_GHODIUM_ACID]: INTERMEDIATE,
    [RESOURCE_GHODIUM_ALKALIDE]: INTERMEDIATE,
    [RESOURCE_CATALYZED_UTRIUM_ACID]: CATALYZED,
    [RESOURCE_CATALYZED_UTRIUM_ALKALIDE]: CATALYZED,
    [RESOURCE_CATALYZED_KEANIUM_ACID]: CATALYZED,
    [RESOURCE_CATALYZED_KEANIUM_ALKALIDE]: CATALYZED,
    [RESOURCE_CATALYZED_LEMERGIUM_ACID]: CATALYZED,
    [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]: CATALYZED,
    [RESOURCE_CATALYZED_ZYNTHIUM_ACID]: CATALYZED,
    [RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE]: CATALYZED,
    [RESOURCE_CATALYZED_GHODIUM_ACID]: CATALYZED,
    [RESOURCE_CATALYZED_GHODIUM_ALKALIDE]: CATALYZED,
    [RESOURCE_OPS]: fillLevel(18000, 0, 0),
    [RESOURCE_UTRIUM_BAR]: BAR,
    [RESOURCE_LEMERGIUM_BAR]: BAR,
    [RESOURCE_ZYNTHIUM_BAR]: BAR,
    [RESOURCE_KEANIUM_BAR]: BAR,
    [RESOURCE_GHODIUM_MELT]: BAR,
    [RESOURCE_OXIDANT]: BAR,
    [RESOURCE_REDUCTANT]: BAR,
    [RESOURCE_PURIFIER]: BAR,
    [RESOURCE_BATTERY]: BAR,
    [RESOURCE_COMPOSITE]: fillLevel(1000, 0, 0, { factory2: 400, factory3: 1000 }),
    [RESOURCE_CRYSTAL]: fillLevel(1000, 0, 0, { factory5: 2200 }),
    [RESOURCE_LIQUID]: fillLevel(1000, 0, 0, { factory4: 3000, factory5: 3000 }),
    [RESOURCE_WIRE]: fillLevel(0, 0, 0, { factory1: 800, factory2: 300, factory3: 234 }),
    [RESOURCE_SWITCH]: fillLevel(0, 0, 0, { factory2: 80, factory4: 80 }),
    [RESOURCE_TRANSISTOR]: fillLevel(0, 0, 0, { factory3: 40, factory4: 100 }),
    [RESOURCE_MICROCHIP]: fillLevel(0, 0, 0, { factory4: 20, factory5: 60 }),
    [RESOURCE_CIRCUIT]: fillLevel(0, 0, 0, { factory5: 20 }),
    [RESOURCE_DEVICE]: NO_STORAGE,
    [RESOURCE_CELL]: fillLevel(0, 0, 0, { factory1: 400, factory2: 200, factory5: 620 }),
    [RESOURCE_PHLEGM]: fillLevel(0, 0, 0, { factory2: 200, factory3: 60 }),
    [RESOURCE_TISSUE]: fillLevel(0, 0, 0, { factory3: 60, factory4: 100, factory5: 120 }),
    [RESOURCE_MUSCLE]: fillLevel(0, 0, 0, { factory4: 20 }),
    [RESOURCE_ORGANOID]: fillLevel(0, 0, 0, { factory5: 20 }),
    [RESOURCE_ORGANISM]: NO_STORAGE,
    [RESOURCE_ALLOY]: fillLevel(0, 0, 0, { factory1: 800, factory2: 820 }),
    [RESOURCE_TUBE]: fillLevel(0, 0, 0, { factory3: 80, factory4: 300, factory5: 240 }),
    [RESOURCE_FIXTURES]: fillLevel(0, 0, 0, { factory3: 40, factory4: 60, factory5: 240 }),
    [RESOURCE_FRAME]: fillLevel(0, 0, 0, { factory5: 40 }),
    [RESOURCE_HYDRAULICS]: fillLevel(0, 0, 0, { factory5: 20 }),
    [RESOURCE_MACHINE]: NO_STORAGE,
    [RESOURCE_CONDENSATE]: fillLevel(0, 0, 0, { factory1: 600, factory2: 600 }),
    [RESOURCE_CONCENTRATE]: fillLevel(0, 0, 0, { factory2: 200, factory3: 120, factory4: 60 }),
    [RESOURCE_EXTRACT]: fillLevel(0, 0, 0, { factory3: 40, factory4: 40 }),
    [RESOURCE_SPIRIT]: fillLevel(0, 0, 0, { factory4: 40, factory5: 60 }),
    [RESOURCE_EMANATION]: fillLevel(0, 0, 0, { factory5: 20 }),
    [RESOURCE_ESSENCE]: NO_STORAGE,
  };

  g._behaviors = {};

  g.getBehavior = function (key) {
    return this._registerBehavior(key);
  };

  g._registerBehavior = function (n) {
    if (!n) return null;

    if (!g._behaviors[n]) {
      try {
        // Check if behavior name contains parameters (e.g., "goto_flag:red")
        var moduleName = n;
        if (n.indexOf(":") !== -1) {
          moduleName = n.split(":")[0];
        }
        
        var behaviorModule = require("behavior." + moduleName);
        
        // If module is a function (factory), call it with the behavior name
        if (typeof behaviorModule === "function") {
          g._behaviors[n] = behaviorModule(n);
        } else {
          // Otherwise, use the module directly
          g._behaviors[n] = behaviorModule;
        }
      } catch (e) {
        Log.error(`Error loading behavior '${n}': ${e}`, "Behavior");
        g._behaviors[n] = null;
      }
    }

    return g._behaviors[n] || null;
  };

  g._creeps = require("config.creeps");

  g.getCreepConfig = function (role) {
    if (role && this._creeps[role]) {
      return this._creeps[role];
    }
    return null;
  };

  g.getCreepsConfig = function () {
    return this._creeps;
  };

  g.getCreepRoles = function () {
    var creepsConfig = this.creeps;
    return _.sortBy(Object.keys(this._creeps), function (r) {
      return global._creeps[r].priority || 999;
    });
  };

  g.whatsInTerminals = function () {
    let myUsername = g.getMyUsername();
    let roomData = {};
    let sums = {};
    let rooms = _.filter(Game.rooms, (r) => {
      if (r.controller && r.controller.my && r.terminal) {
        return true;
      }
    });
    _.forEach(rooms, (r) => {
      roomData[r.name] = roomData[r.name] || {};
      _.forEach(r.terminal.store, (quantity, item) => {
        sums[item] = sums[item] || 0;
        sums[item] = sums[item] + quantity;
        roomData[r.name][item] = quantity;
      });
    });
    Log.info("Room Data: " + JSON.stringify(roomData, null, 3), "Terminal");
    Log.info("Totals: " + JSON.stringify(sums, null, 3), "Terminal");
  };

  global.resourceImg = function (resourceType) {
    return (
      '<a target="_blank" href="https://screeps.com/a/#!/market/all/' +
      Game.shard.name +
      "/" +
      resourceType +
      '"><img src ="https://s3.amazonaws.com/static.screeps.com/upload/mineral-icons/' +
      resourceType +
      '.png" /></a>'
    );
  };

  g.numberOfTerminals = function () {
    let numberOfTerminals = 0;
    for (var i in Game.rooms) {
      if (Game.rooms[i].terminal) {
        numberOfTerminals += 1;
      }
    }
    return numberOfTerminals;
  };

  const ResourceManager = require("ResourceManager");
  
  global.globalResourcesAmount = function (resource) {
    return ResourceManager.getGlobalResourceAmount(resource);
  };

  global.reorderResources = () => {
    const scriptInject = `
<script>
const g = window || global;
clearInterval(g.resourceReorder);
g.resourceReorder = setInterval(() => {
    /* Resources are are grouped by functionality. Color is sorted by Hue within a category */
    const resourceOrder = ["energy","power", "H","O","Z","L","U","K","X","G","OH","ZK","UL","ZH","ZH2O","XZH2O","ZO","ZHO2","XZHO2","LH","LH2O","XLH2O","LO","LHO2","XLHO2","UH","UH2O","XUH2O","UO","UHO2","XUHO2","KH","KH2O","XKH2O","KO","KHO2","XKHO2","GH","GH2O","XGH2O","GO","GHO2","XGHO2","ops","battery","reductant","oxidant","zynthium_bar","lemergium_bar","utrium_bar","keanium_bar","purifier","ghodium_melt","composite","crystal","liquid","metal","alloy","tube","wire","fixtures","frame","hydraulics","machine","biomass","cell","phlegm","tissue","muscle","organoid","organism","silicon","wire","switch","transistor","microchip","circuit","device","mist","condensate","concentrate","extract","spirit","emanation","essence"];;
    const $scope = angular.element(document.getElementsByClassName('carry-resource')[0]).scope();
    if(!$scope){ return; }
    const orderedStore = {};
    const curStore = $scope.Room.selectedObject.store;
    for (const resource of resourceOrder) {
        if (resource in curStore) {
            orderedStore[resource] = curStore[resource];
        }
    }
    /* Need to append a random element to force an angular update */
    orderedStore['dummy_' + Math.random()] = 0;
    $scope.Room.selectedObject.store = orderedStore;
}, 1000);
</script>`.replace(/\r?\n|\r/g, ``);
    Log.info(scriptInject, "ScriptInject");
  };

  global.showLabs = function () {
    let result = [];
    result.push('<table border="1">');
    result.push("<caption> LABS\n</caption>");
    result.push("<tr>");
    result.push("<th> STATUS </th>");
    result.push("<th> C </th>");
    result.push("<th> C </th>");
    result.push("<th> A </th>");
    result.push("<th> B </th>");
    result.push("<th> A </th>");
    result.push("<th> B </th>");
    result.push("</tr>");

    for (var i in Game.rooms) {
      var room = Game.rooms[i];

      var labs = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return 'structureType' in structure && structure.structureType == STRUCTURE_LAB;
        },
      });

      for (var j in labs) {
        var labC = labs[j];
        // @ts-ignore - Lab memory is custom
        var labMemory = labC.memory;
        if (labC && labMemory && labMemory.partnerA) {
          result.push("<tr>");
          var partnerA = Game.getObjectById(labMemory.partnerA);
          var partnerB = Game.getObjectById(labMemory.partnerB);
          // @ts-ignore - Lab memory is custom
          var partnerAMemory = partnerA && partnerA.memory ? partnerA.memory : null;
          if (partnerA && partnerAMemory) {
            result.push("<td> " + partnerAMemory.status + " </td>");
            result.push("<td> " + global.resourceImg(labMemory.resource) + " </td>");
            result.push("<td> " + labC + " </td>");
            result.push("<td> " + global.resourceImg(partnerAMemory.resource) + " </td>");
            // @ts-ignore - Lab memory is custom
            var partnerBMemory = partnerB && partnerB.memory ? partnerB.memory : null;
            if (partnerB && partnerBMemory) {
              result.push("<td> " + global.resourceImg(partnerBMemory.resource) + " </td>");
            }
            result.push("<td> " + partnerA + " </td>");
            if (partnerB) {
              result.push("<td> " + partnerB + " </td>");
            }
            result.push("</tr>");
          }
        }
      }
    }
    var resultString = result.join("");
    return resultString;
  };

  global.myResources = function (hide = false) {
    let result = [];
    result.push('<table border="1">');
    result.push("<caption> RESOURCE\n</caption>");
    result.push("<tr>");
    result.push("<th></th>");
    result.push("<th> AMOUNT </th>");
    result.push("<th> Offset to perfect </th>");
    result.push("</tr>");

    let numberOfRooms = 0;
    for (var i in Game.rooms) {
      if (Game.rooms[i].storage) numberOfRooms += 1;
    }

    for (var i in RESOURCES_ALL) {
      var resource = RESOURCES_ALL[i];

      if (!hide) {
        result.push("<tr>");
        result.push("<td> " + global.resourceImg(resource) + " </td>");
        result.push("<td align='right'> " + global.globalResourcesAmount(resource) + " </td>");
        let offset = global.globalResourcesAmount(resource) - numberOfRooms * global.getRoomThreshold(resource, "all");
        if (offset >= 0) {
          result.push("<td align='right' style='color:#008000'> " + offset + " </td>");
        } else {
          result.push("<td align='right' style='color:#FF0000'> " + offset + " </td>");
        }
        result.push("</tr>");
      } else {
        if (global.globalResourcesAmount && global.globalResourcesAmount(resource) > 0) {
          result.push("<tr>");
          result.push("<td> " + global.resourceImg(resource) + " </td>");
          result.push("<td align='right'> " + global.globalResourcesAmount(resource) + " </td>");
          result.push("<td align='right'> " + (global.globalResourcesAmount(resource) - numberOfRooms * global.getRoomThreshold(resource, "all")) + " </td>");
          result.push("</tr>");
        }
      }
    }

    var resultString = result.join("");
    return resultString;
  };

  global.marketInfo = function () {
    let amountSell;
    let amountBuy;
    let priceSell;
    let lastPriceSell;
    let priceBuy;
    let lastPriceBuy;

    var result = [];
    result.push('<table border="1">');
    result.push("<caption> MARKET\n</caption>");
    result.push("<tr>");
    result.push("<th></th>");
    result.push("<th> MIN SELL PRICE </th>");
    result.push("<th> AMOUNT ON SELL </th>");
    result.push("<th> MAX SELL PRICE </th>");
    result.push("<th> AMOUNT SELL ORDERS </th>");
    result.push("<th></th>");
    result.push("<th> MIN BUY PRICE </th>");
    result.push("<th> AMOUNT ON BUY </th>");
    result.push("<th> MAX BUY PRICE </th>");
    result.push("<th> AMOUNT BUY ORDERS </th>");
    result.push("</tr>");

    const orders = Game.market.getAllOrders();

    for (var i in RESOURCES_ALL) {
      var resources = RESOURCES_ALL[i];

      var orderMinerals = orders.filter((order) => order.resourceType == resources);

      var ordersSell = orderMinerals.filter((order) => order.type == "sell");
      var ordersBuy = orderMinerals.filter((order) => order.type == "buy");

      ordersSell.sort((a, b) => a.price - b.price);
      ordersBuy.sort((a, b) => a.price - b.price);

      if (ordersSell[0] && ordersSell[0].price) {
        priceSell = ordersSell[0].price;
        lastPriceSell = ordersSell[ordersSell.length - 1].price;
      } else {
        priceSell = " - ";
        lastPriceSell = " - ";
      }

      if (ordersBuy[0] && ordersBuy[0].price) {
        priceBuy = ordersBuy[0].price;
        lastPriceBuy = ordersBuy[ordersBuy.length - 1].price;
      } else {
        priceBuy = " - ";
        lastPriceBuy = " - ";
      }

      if (ordersSell[0] && ordersSell[0].amount) {
        amountSell = ordersSell[0].amount;
        if (amountSell > 1000) amountSell = amountSell / 1000 + "K";
      } else amountSell = " - ";

      if (ordersBuy[0] && ordersBuy[0].amount) {
        amountBuy = ordersBuy[ordersBuy.length - 1].amount;
        if (amountBuy > 1000) amountBuy = amountBuy / 1000 + "K";
      } else amountBuy = " - ";

      result.push("<tr>");
      result.push("<td> " + global.resourceImg(resources) + " </td>");
      result.push("<td> " + priceSell + " </td>");
      result.push("<td> " + amountSell + " </td>");
      result.push("<td> " + lastPriceSell + " </td>");
      result.push("<td> " + ordersSell.length + " </td>");
      result.push("<td> " + global.resourceImg(resources) + " </td>");
      result.push("<td> " + priceBuy + " </td>");
      result.push("<td> " + amountBuy + " </td>");
      result.push("<td> " + lastPriceBuy + " </td>");
      result.push("<td> " + ordersBuy.length + " </td>");
      result.push("</tr>");
    }

    var resultString = result.join("");
    return resultString;
  };

  global.json = (x) => JSON.stringify(x, null, 2);

  // ==================== RoomPlanner Helper Functions ====================
  // These functions provide console access to the RoomPlanner
  
  const RoomPlanner = require("RoomPlanner");
  
  /**
   * Visualizes the planned layout for a room
   * Usage: plannerVisualize('W1N1')
   */
  global.plannerVisualize = function (roomName) {
    const room = Game.rooms[roomName];
    if (!room) {
      Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
      return;
    }
    const planner = new RoomPlanner(room);
    planner.visualize();
    Log.info(`Layout for ${roomName} visualized. Check the room!`, "RoomPlanner");
  };

  /**
   * Returns statistics about the planned layout
   * Usage: plannerStats('W1N1')
   */
  global.plannerStats = function (roomName) {
    const room = Game.rooms[roomName];
    if (!room) {
      Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
      return null;
    }
    const planner = new RoomPlanner(room);
    const stats = planner.getStats();
    Log.info(`RoomPlanner stats for ${roomName}:`, "RoomPlanner");
    Log.info(JSON.stringify(stats, null, 2), "RoomPlanner");
    return stats;
  };

  /**
   * Resets the layout for a room
   * Usage: plannerReset('W1N1')
   */
  global.plannerReset = function (roomName) {
    const room = Game.rooms[roomName];
    if (!room) {
      Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
      return;
    }
    const planner = new RoomPlanner(room);
    planner.reset();
    Log.info(`Layout for ${roomName} has been reset`, "RoomPlanner");
  };

  /**
   * Runs the RoomPlanner manually
   * Usage: plannerRun('W1N1')
   */
  global.plannerRun = function (roomName) {
    const room = Game.rooms[roomName];
    if (!room) {
      Log.warn(`Room ${roomName} not visible`, "RoomPlanner");
      return;
    }
    const planner = new RoomPlanner(room);
    planner.run();
    Log.info(`RoomPlanner for ${roomName} executed`, "RoomPlanner");
  };

  /**
   * Manually sets the center for a room
   * Usage: plannerSetCenter('W1N1', 25, 25)
   */
  global.plannerSetCenter = function (roomName, x, y) {
    if (!Memory.rooms) Memory.rooms = {};
    if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {};
    // Initialize or reset planner with all required properties
    Memory.rooms[roomName].planner = {
      centerX: x,
      centerY: y,
      layoutGenerated: false,
      plannedStructures: [],
    };
    
    Log.info(`Center for ${roomName} set to (${x}, ${y}). Layout will be regenerated on next run.`, "RoomPlanner");
  };

  global.voiceConsole = function voiceConsole(text) {
    // The function below was developed late last year by @stybbe, published in
    //  Screeps Slack's #share-thy-code channel. No license was applied; all
    //  rights remain with the author. Minor fixes were made by @SemperRabbit
    //  to get it working again.

    // NOTE: that this code works in chrome and firefox (albiet quietly
    //  in firefox) but not the steam client.

    let defaultVoice = "Deutsch Female"; // can be changed
    // see https://responsivevoice.org/text-to-speech-languages/

    console.log(
      `<span style="color:green; font-style: italic;">${text}</span>
                 <script>
                    if (!window.speakText){
                        window.speakText = function(gameTime, text) {
                            var id = gameTime + "-" + text;
                            if(!window.voiceHash){
                                window.voiceHash={};
                            } 
                            
                            if (!window.voiceHash[id]){
                                window.voiceHash[id]=true;
                            responsiveVoice.setDefaultVoice("${defaultVoice}");
                                responsiveVoice.speak(text);
                            }
                        }
                    }
                 
                    if (document.getElementById("responsiveVoice")){
                        window.speakText("${Game.time}", "${text}");
                    }else{
                        var script = document.createElement("script");
                        script.type = "text/javascript";
                        script.id = "responsiveVoice";
                        script.onload = function() {
                            responsiveVoice.setDefaultVoice("${defaultVoice}");
                            console.log("responsiveVoice has initialized");
                            window.speakText("${Game.time}", "${text}");
                        };
                        script.src = "https://code.responsivevoice.org/responsivevoice.js";
                        document.getElementsByTagName("head")[0].appendChild(script);
                        setTimeout("responsiveVoice.init()", 1000);
                    }
                </script>`.replace(/(\r\n|\n|\r)\t+|(\r\n|\n|\r) +|(\r\n|\n|\r)/gm, "")
    );
  };
}

module.exports = initGlobal;
