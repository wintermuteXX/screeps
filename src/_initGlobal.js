function initGlobal(g) {

  g.killAll = function () {
    for (var c in Game.creeps) {
      Game.creeps[c].suicide();
    }
  };

  /**
   * Intervals
   */

  g._intervals = {
    'checkPopulation': 10,
    'checkConstructions': 100,
    'checkLinks': 5,
    'checkResourcesQueue': 10,
    'repairTower': 8,
    'maxHitsDefense' : 6000000,
    'internalTrade': 300
  };

  g.getInterval = function (key) {
    if (key && this._intervals[key]) {
      return this._intervals[key];
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

  g.whatsInTerminals = function() {
    let myUsername = Game.spawns[Object.keys(Game.spawns)[0]].owner.username;
    let roomData = {};
    let sums = {};
    let rooms = _.filter(Game.rooms, (r) => {
        if(r.controller 
           && r.controller.my
           && r.terminal) {
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
global.voiceConsole = function voiceConsole(text){
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
                .replace(/(\r\n|\n|\r)\t+|(\r\n|\n|\r) +|(\r\n|\n|\r)/gm,""));
}

}

module.exports = initGlobal;