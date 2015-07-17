# Screeps_DEV
Development Version

## Configuration

### config.creeps.js

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

### behavior.<behavior name>.js




## Features
- Modular Creep Configuration and Behaviors

## Todo List
...
