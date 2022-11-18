function initGlobal(g) {
  // Prototypes für Room Structures
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
      roomStructures[this.name] = _.groupBy(this.find(FIND_STRUCTURES), (s) => s.structureType);
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
          if (roomStructures[this.name][type]) {
            this["_" + type + "s_ts"] = Game.time;
            return (this["_" + type + "s"] = roomStructures[this.name][type].map(Game.getObjectById));
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
          if (roomStructures[this.name][type]) {
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

  global.checkPopulation = 10;
  global.checkConstructions = 100;
  global.checkLinks = 5;
  global.checkResourcesQueue = 1;
  global.repairTower = 8;
  global.maxHitsDefense = 2155000;
  global.repairLimit = 0.95;
  global.noAnalyseLimit = 100;
  // Storage
  global.maxEnergyThreshold = 100000;
  // Terminal
  global.internalTrade = 25;
  global.buyEnergyOrder = 20;
  global.sellRoomMineralOverflow = 499;
  global.sellRoomMineral = 200;
  global.minSellPrice = 0.04;
  global.modSellAmount1 = 50000;
  global.modSellMultiplier1 = 1.5;
  global.modSellAmount2 = 90000;
  global.modSellMultiplier2 = 1.2;
  global.modSellAmount3 = 150000;
  global.modSellMultiplier3 = 0.9;
  global.modSellMultiplier4 = 0.75;
  global.minOrderAmount = 50000;
  global.maxOrderAmount = 150000;
  global.energyPrice = 0.02;
  global.theProfit = 0.05;
  // Resources
  global.fillLevel = {
    [RESOURCE_ENERGY]: {
      storage: 30000,
      terminal: 50000,
      factory: 5000,
    },
    [RESOURCE_POWER]: {
      storage: 5000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_HYDROGEN]: {
      storage: 21000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_OXYGEN]: {
      storage: 21000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_UTRIUM]: {
      storage: 21000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_LEMERGIUM]: {
      storage: 21000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_KEANIUM]: {
      storage: 21000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_ZYNTHIUM]: {
      storage: 21000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_CATALYST]: {
      storage: 21000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_GHODIUM]: {
      storage: 21000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_SILICON]: {
      storage: 5000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_METAL]: {
      storage: 5000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_BIOMASS]: {
      storage: 5000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_MIST]: {
      storage: 5000,
      terminal: 0,
      factory: 2000,
    },
    [RESOURCE_HYDROXIDE]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_ZYNTHIUM_KEANITE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_UTRIUM_LEMERGITE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_UTRIUM_HYDRIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_UTRIUM_OXIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_KEANIUM_HYDRIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_KEANIUM_OXIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_LEMERGIUM_HYDRIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_LEMERGIUM_OXIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_ZYNTHIUM_HYDRIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_ZYNTHIUM_OXIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_GHODIUM_HYDRIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_GHODIUM_OXIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_UTRIUM_ACID]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_UTRIUM_ALKALIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_KEANIUM_ACID]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_KEANIUM_ALKALIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_LEMERGIUM_ACID]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_LEMERGIUM_ALKALIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_ZYNTHIUM_ACID]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_ZYNTHIUM_ALKALIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_GHODIUM_ACID]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_GHODIUM_ALKALIDE]: {
      storage: 9000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_UTRIUM_ACID]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_UTRIUM_ALKALIDE]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_KEANIUM_ACID]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_KEANIUM_ALKALIDE]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_LEMERGIUM_ACID]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_ZYNTHIUM_ACID]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_GHODIUM_ACID]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CATALYZED_GHODIUM_ALKALIDE]: {
      storage: 21000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_OPS]: {
      storage: 18000,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_UTRIUM_BAR]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_LEMERGIUM_BAR]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_ZYNTHIUM_BAR]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_KEANIUM_BAR]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_GHODIUM_MELT]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_OXIDANT]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_REDUCTANT]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_PURIFIER]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_BATTERY]: {
      storage: 5000,
      terminal: 0,
      factory: 1000,
    },
    [RESOURCE_COMPOSITE]: {
      storage: 1000,
      terminal: 0,
      factory2: 400,
      factory3: 1000,
    },
    [RESOURCE_CRYSTAL]: {
      storage: 1000,
      terminal: 0,
      factory5: 2200,
    },
    [RESOURCE_LIQUID]: {
      storage: 1000,
      terminal: 0,
      factory4: 3000,
      factory5: 3000,
    },
    [RESOURCE_WIRE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory1: 800,
      factory2: 300,
      factory3: 234,
    },
    [RESOURCE_SWITCH]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory2: 80,
      factory4: 80,
    },
    [RESOURCE_TRANSISTOR]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory3: 40,
      factory4: 100,
    },
    [RESOURCE_MICROCHIP]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory4: 20,
      factory5: 60,
    },
    [RESOURCE_CIRCUIT]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory5: 20,
    },
    [RESOURCE_DEVICE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CELL]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory1: 400,
      factory2: 200,
      factory5: 620,
    },
    [RESOURCE_PHLEGM]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory2: 200,
      factory3: 60,
    },
    [RESOURCE_TISSUE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory3: 60,
      factory4: 100,
      factory5: 120,
    },
    [RESOURCE_MUSCLE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory4: 20,
    },
    [RESOURCE_ORGANOID]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory5: 20,
    },
    [RESOURCE_ORGANISM]: {
      storage: 0,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_ALLOY]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory1: 800,
      factory2: 820,
    },
    [RESOURCE_TUBE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory3: 80,
      factory4: 300,
      factory5: 240,
    },
    [RESOURCE_FIXTURES]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory3: 40,
      factory4: 60,
      factory5: 240,
    },
    [RESOURCE_FRAME]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory5: 40,
    },
    [RESOURCE_HYDRAULICS]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory5: 20,
    },
    [RESOURCE_MACHINE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
    },
    [RESOURCE_CONDENSATE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory1: 600,
      factory2: 600,
    },
    [RESOURCE_CONCENTRATE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory2: 200,
      factory3: 120,
      factory4: 60,
    },
    [RESOURCE_EXTRACT]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory3: 40,
      factory4: 40,
    },
    [RESOURCE_SPIRIT]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory4: 40,
      factory5: 60,
    },
    [RESOURCE_EMANATION]: {
      storage: 0,
      terminal: 0,
      factory: 0,
      factory5: 20,
    },
    [RESOURCE_ESSENCE]: {
      storage: 0,
      terminal: 0,
      factory: 0,
    },
  };

  g._behaviors = {};

  g.getBehavior = function (key) {
    return this._registerBehavior(key);
  };

  g._registerBehavior = function (n) {
    if (!n) return null;

    if (!g._behaviors[n]) {
      try {
        g._behaviors[n] = require("behavior." + n);
      } catch (e) {
        console.log("Error loading behavior '" + n + "'", e);
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

  // TODO this belongs in _init.js
  global.getRoomThreshold = function (resource, structure = "all") {
    let amount = 0;
    if (structure == "all" || structure == "storage") amount += global.fillLevel[resource].storage || 0;
    if (structure == "all" || structure == "terminal") amount += global.fillLevel[resource].terminal || 0;
    if (structure == "all" || structure == "factory") amount += global.fillLevel[resource].factory || 0;
    if (structure == "factory1") amount += global.fillLevel[resource].factory1 || 0;
    if (structure == "factory2") amount += global.fillLevel[resource].factory2 || 0;
    if (structure == "factory3") amount += global.fillLevel[resource].factory3 || 0;
    if (structure == "factory4") amount += global.fillLevel[resource].factory4 || 0;
    if (structure == "factory5") amount += global.fillLevel[resource].factory5 || 0;

    return amount;
  };

  g.whatsInTerminals = function () {
    let myUsername = Game.spawns[Object.keys(Game.spawns)[0]].owner.username;
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
    console.log("Room Data:", JSON.stringify(roomData, null, 3));
    console.log("Totals:", JSON.stringify(sums, null, 3));
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
    for (i in Game.rooms) {
      if (Game.rooms[i].terminal) {
        numberOfTerminals += 1;
      }
    }
    return numberOfTerminals;
  };

  global.amountGlobalResources = function (resource) {
    let amount = 0;
    let allStr = [];

    for (i in Game.rooms) {
      room = Game.rooms[i];

      storeStr = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return structure.store;
        },
      });

      allStr = allStr.concat(storeStr);
    }

    for (i in allStr) {
      if (allStr[i].store[resource] > 0) amount += allStr[i].store[resource];
    }

    return amount;
  };

  global.reorderResources = () => {
    const scriptInject = `
<script>
const g = window || global;
clearInterval(g.resourceReorder);
g.resourceReorder = setInterval(() => {
    /* Resources are are grouped by functionality. Color is sorted by Hue within a category */
    const resourceOrder = ["energy","H","O","Z","L","U","K","X","G","OH","ZK","UL","ZH","ZH2O","XZH2O","ZO","ZHO2","XZHO2","LH","LH2O","XLH2O","LO","LHO2","XLHO2","UH","UH2O","XUH2O","UO","UHO2","XUHO2","KH","KH2O","XKH2O","KO","KHO2","XKHO2","GH","GH2O","XGH2O","GO","GHO2","XGHO2","ops","battery","reductant","oxidant","zynthium_bar","lemergium_bar","utrium_bar","keanium_bar","purifier","ghodium_melt","composite","crystal","liquid","metal","alloy","tube","wire","fixtures","frame","hydraulics","machine","biomass","cell","phlegm","tissue","muscle","organoid","organism","silicon","wire","switch","transistor","microchip","circuit","device","mist","condensate","concentrate","extract","spirit","emanation","essence"];;
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
    console.log(scriptInject);
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

    for (i in Game.rooms) {
      let room = Game.rooms[i];

      let labs = room.find(FIND_STRUCTURES, {
        filter: (i) => i.structureType == STRUCTURE_LAB,
      });

      for (i in labs) {
        let labC = labs[i];
        if (labC.memory.partnerA) {
          result.push("<tr>");
          result.push("<td> " + Game.getObjectById(labC.memory.partnerA).memory.status + " </td>");
          result.push("<td> " + resourceImg(labC.memory.resource) + " </td>");
          result.push("<td> " + labC + " </td>");
          result.push("<td> " + resourceImg(Game.getObjectById(labC.memory.partnerA).memory.resource) + " </td>");
          result.push("<td> " + resourceImg(Game.getObjectById(labC.memory.partnerB).memory.resource) + " </td>");
          result.push("<td> " + Game.getObjectById(labC.memory.partnerA) + " </td>");
          result.push("<td> " + Game.getObjectById(labC.memory.partnerB) + " </td>");
          result.push("</tr>");
        }
      }
    }
    result = result.join("");
    return result;
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
    for (i in Game.rooms) {
      if (Game.rooms[i].storage) numberOfRooms += 1;
    }

    for (i in RESOURCES_ALL) {
      let resource = RESOURCES_ALL[i];

      if (!hide) {
        result.push("<tr>");
        result.push("<td> " + resourceImg(resource) + " </td>");
        result.push("<td align='right'> " + amountGlobalResources(resource) + " </td>");
        let offset = amountGlobalResources(resource) - numberOfRooms * global.getRoomThreshold(resource, "all");
        if (offset >= 0) {
          result.push("<td align='right' style='color:#008000'> " + offset + " </td>");
        } else {
          result.push("<td align='right' style='color:#FF0000'> " + offset + " </td>");
        }
        result.push("</tr>");
      } else {
        if (amountGlobalResources(resource) > 0) {
          result.push("<tr>");
          result.push("<td> " + resourceImg(resource) + " </td>");
          result.push("<td align='right'> " + amountGlobalResources(resource) + " </td>");
          result.push("<td align='right'> " + (amountGlobalResources(resource) - numberOfRooms * global.getRoomThreshold(resource, "all")) + " </td>");
          result.push("</tr>");
        }
      }
    }

    result = result.join("");
    return result;
  };

  global.marketInfo = function () {
    let amountSell;
    let amountBuy;
    let priceSell;
    let lastPriceSell;
    let priceBuy;
    let lastPriceBuy;

    result = [];
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

    // let test;

    // test = _.groupBy(orders, o => o.type);

    for (i in RESOURCES_ALL) {
      resources = RESOURCES_ALL[i];

      orderMinerals = orders.filter((order) => order.resourceType == resources);

      ordersSell = orderMinerals.filter((order) => order.type == "sell");
      ordersBuy = orderMinerals.filter((order) => order.type == "buy");

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
      result.push("<td> " + resourceImg(resources) + " </td>");
      result.push("<td> " + priceSell + " </td>");
      result.push("<td> " + amountSell + " </td>");
      result.push("<td> " + lastPriceSell + " </td>");
      result.push("<td> " + ordersSell.length + " </td>");
      result.push("<td> " + resourceImg(resources) + " </td>");
      result.push("<td> " + priceBuy + " </td>");
      result.push("<td> " + amountBuy + " </td>");
      result.push("<td> " + lastPriceBuy + " </td>");
      result.push("<td> " + ordersBuy.length + " </td>");
      result.push("</tr>");
    }

    result = result.join("");
    return result;
  };

  global.json = (x) => JSON.stringify(x, null, 2);

  global.defaultVoice = "Deutsch Female"; // can be changed
  // see https://responsivevoice.org/text-to-speech-languages/
  // for options
  global.voiceConsole = function voiceConsole(text) {
    // The function below was developed late last year by @stybbe, published in
    //  Screeps Slack's #share-thy-code channel. No license was applied; all
    //  rights remain with the author. Minor fixes were made by @SemperRabbit
    //  to get it working again.

    // NOTE: that this code works in chrome and firefox (albiet quietly
    //  in firefox) but not the steam client.

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
