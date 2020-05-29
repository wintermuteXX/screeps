function initGlobal(g) {

  // Prototpyes für Room Structures
  var roomStructures = {};
  var roomStructuresExpiration = {};
  const CACHE_TIMEOUT = 50;
  const CACHE_OFFSET = 4;
  const multipleList = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_KEEPER_LAIR, STRUCTURE_PORTAL, STRUCTURE_LINK, STRUCTURE_TOWER, STRUCTURE_LAB, STRUCTURE_CONTAINER, STRUCTURE_POWER_BANK];
  const singleList = [STRUCTURE_OBSERVER, STRUCTURE_POWER_SPAWN, STRUCTURE_EXTRACTOR, STRUCTURE_NUKER];
  //STRUCTURE_TERMINAL,   STRUCTURE_CONTROLLER,   STRUCTURE_STORAGE,

  function getCacheExpiration() {
    return CACHE_TIMEOUT + Math.round((Math.random() * CACHE_OFFSET * 2) - CACHE_OFFSET);
  };

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
      roomStructures[this.name] = _.groupBy(this.find(FIND_STRUCTURES), s => s.structureType);
      var i;
      for (i in roomStructures[this.name]) {
        roomStructures[this.name][i] = _.map(roomStructures[this.name][i], s => s.id);
      }
    }
  };
  multipleList.forEach(function (type) {
    Object.defineProperty(Room.prototype, type + 's', {
      get: function () {
        if (this['_' + type + 's'] && this['_' + type + 's_ts'] === Game.time) {
          return this['_' + type + 's'];
        } else {
          this._checkRoomCache();
          if (roomStructures[this.name][type]) {
            this['_' + type + 's_ts'] = Game.time;
            return this['_' + type + 's'] = roomStructures[this.name][type].map(Game.getObjectById);
          } else {
            this['_' + type + 's_ts'] = Game.time;
            return this['_' + type + 's'] = [];
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
        if (this['_' + type] && this['_' + type + '_ts'] === Game.time) {
          return this['_' + type];
        } else {
          this._checkRoomCache();
          if (roomStructures[this.name][type]) {
            this['_' + type + '_ts'] = Game.time;
            return this['_' + type] = Game.getObjectById(roomStructures[this.name][type][0]);
          } else {
            this['_' + type + '_ts'] = Game.time;
            return this['_' + type] = undefined;
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

  /**
   * Intervals
   */

  g._fixedValue = {
    'checkPopulation': 10,
    'checkConstructions': 100,
    'checkLinks': 5,
    'checkResourcesQueue': 1,
    'repairTower': 8,
    'maxHitsDefense': 1000000,
    'repairLimit': 0.95,
    'noAnalyseLimit': 100,
    // Storage
    'minEnergyThreshold': 30000,
    'minResourceThreshold': 20000,
    'storageMaxEnergyAmount': 100000,
    // Terminal
    'internalTrade': 300,
    'minCreditThreshold': 50000,
    'buyEnergyOrder': 20,
    'sellRoomMineralOverflow': 499,
    'sellRoomMineral': 1000,
    'minSellPrice': 0.04,
    'modSellAmount1': 50000,
    'modSellMultiplier1': 1.2,
    'modSellAmount2': 90000,
    'modSellMultiplier2': 1.1,
    'modSellAmount3': 150000,
    'modSellMultiplier3': 0.9
  };

  g.getFixedValue = function (key) {
    if (key && this._fixedValue[key]) {
      return this._fixedValue[key];
    }
    return 0;
  };

  /**
   * Behaviors
   */

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

  g.whatsInTerminals = function () {
    let myUsername = Game.spawns[Object.keys(Game.spawns)[0]].owner.username;
    let roomData = {};
    let sums = {};
    let rooms = _.filter(Game.rooms, (r) => {
      if (r.controller &&
        r.controller.my &&
        r.terminal) {
        return true;
      }
    })
    _.forEach(rooms, (r) => {
      roomData[r.name] = roomData[r.name] || {};
      _.forEach(r.terminal.store, (quantity, item) => {
        sums[item] = sums[item] || 0;
        sums[item] = sums[item] + quantity;
        roomData[r.name][item] = quantity;
      })
    })
    console.log('Room Data:', JSON.stringify(roomData, null, 3));
    console.log('Totals:', JSON.stringify(sums, null, 3));
  }

  global.resourceImg = function (resourceType) {
    return '<a target="_blank" href="https://screeps.com/a/#!/market/all/' + Game.shard.name + '/' + resourceType + '"><img src ="https://s3.amazonaws.com/static.screeps.com/upload/mineral-icons/' + resourceType + '.png" /></a>';
  };

  global.amountResources = function (resource) {
    let amount = 0
    let allStr = []

    for (i in Game.rooms) {
      room = Game.rooms[i];

      storeStr = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.store);
        }
      });

      allStr = allStr.concat(storeStr);
    }

    for (i in allStr) {
      if (allStr[i].store[resource] > 0) amount += allStr[i].store[resource];
    }

    return amount
  }

  global.myResources = function (hide = false) {
    let result = [];
    result.push("<table border=\"1\">");
    result.push('<caption> RESOURCE\n</caption>');
    result.push("<tr>");
    result.push("<th></th>");
    result.push("<th> AMOUNT </th>");
    result.push("</tr>");

    for (i in RESOURCES_ALL) {

      let resource = RESOURCES_ALL[i]

      if (!hide) {
        result.push("<tr>");
        result.push("<td> " + resourceImg(resource) + " </td>");
        result.push("<td align='right'> " + amountResources(resource) + " </td>");
        result.push("</tr>");
      } else {
        if (amountResources(resource) > 0) {
          result.push("<tr>");
          result.push("<td> " + resourceImg(resource) + " </td>");
          result.push("<td align='right'> " + amountResources(resource) + " </td>");
          result.push("</tr>");
        }
      }
    }

    result = result.join("");
    return result
  }

  global.marketInfo = function () {

    let amountSell
    let amountBuy
    let priceSell
    let lastPriceSell
    let priceBuy
    let lastPriceBuy


    result = [];
    result.push("<table border=\"1\">");
    result.push('<caption> MARKET\n</caption>');
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

      resources = RESOURCES_ALL[i]

      orderMinerals = orders.filter(order => order.resourceType == resources)

      ordersSell = orderMinerals.filter(order => order.type == "sell");
      ordersBuy = orderMinerals.filter(order => order.type == "buy");

      ordersSell.sort((a, b) => a.price - b.price);
      ordersBuy.sort((a, b) => a.price - b.price);

      if (ordersSell[0] && ordersSell[0].price) {
        priceSell = ordersSell[0].price;
        lastPriceSell = ordersSell[ordersSell.length - 1].price
      } else {
        priceSell = " - ";
        lastPriceSell = " - ";
      }

      if (ordersBuy[0] && ordersBuy[0].price) {
        priceBuy = ordersBuy[0].price;
        lastPriceBuy = ordersBuy[ordersBuy.length - 1].price
      } else {
        priceBuy = " - ";
        lastPriceBuy = " - ";
      }

      if (ordersSell[0] && ordersSell[0].amount) {
        amountSell = ordersSell[0].amount;
        if (amountSell > 1000) amountSell = amountSell / 1000 + "K"
      } else amountSell = " - ";

      if (ordersBuy[0] && ordersBuy[0].amount) {
        amountBuy = ordersBuy[ordersBuy.length - 1].amount;
        if (amountBuy > 1000) amountBuy = amountBuy / 1000 + "K"

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
    return result
  }

  global.json = (x) => JSON.stringify(x, null, 2);

  // The function below was developed late last year by @stybbe, published in
  //  Screeps Slack's #share-thy-code channel. No license was applied; all  
  //  rights remain with the author. Minor fixes were made by @SemperRabbit 
  //  to get it working again.

  // NOTE: that this code works in chrome and firefox (albiet quietly
  //  in firefox) but not the steam client.

  global.defaultVoice = "Deutsch Female"; // can be changed
  // see https://responsivevoice.org/text-to-speech-languages/
  // for options
  global.voiceConsole = function voiceConsole(text) {
    console.log(`<span style="color:green; font-style: italic;">${text}</span>
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
                </script>`
      .replace(/(\r\n|\n|\r)\t+|(\r\n|\n|\r) +|(\r\n|\n|\r)/gm, ""));
  }

}

module.exports = initGlobal;