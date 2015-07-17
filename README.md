# Screeps_DEV
Development Version
===

# Features
===
- Modular Creep Configuration and Behaviors
- Handling mutliple Spawns
- Priority list for spawning Creeps
- Alternating bodies per level and max available energy

# Todo List
===
...

# Configuration
===

## config.creeps.js
```
module.exports = {
  ...

  <role> : {
    [priority : int],
    [levelMin : int],
    [levelMax : int],

    canBuild : function:boolean

    body : [
      [], // body for level 1
      [], // body for level 2
      ...
    ],

    behaviors : [<behavior name 1>, <behavior name 2>, ...]

  },

  ...
}
```

### behavior.[behavior name].js
```
var Behavior = require("behavior.base");

var b = new Behavior("name");

b.when = function(creep, rc) {
  return true;
};

b.completed = function(creep, rc) {
  return false;
};

b.work = function(creep, rc) {

};

module.exports = b;
```
