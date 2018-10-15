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
  }​;
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
    'checkResourcesQueue': 10,
    'repairTower': 8,
    'maxHitsDefense': 6000000,
    'internalTrade': 300,
    'sellOverflow': 499
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