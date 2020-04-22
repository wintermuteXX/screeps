require("_initGlobal")(global);

/**
 * Extend Creep
 */

// if (Creep && Creep.prototype && !Creep.prototype.behavior) {

Object.defineProperty(Creep.prototype, "behavior", {
  get: function () {
    return this.memory.behavior || null;
  },
  set: function (newBehavior) {
    if (newBehavior !== null) {
      this.memory.behavior = newBehavior;
    } else {

      delete this.memory.behavior;
    }
    this.target = null;
  }
});

Object.defineProperty(Creep.prototype, "energy", {
  get: function () {
    return this.store.getUsedCapacity();
  }
});

Object.defineProperty(Creep.prototype, "role", {
  get: function () {
    return this.memory.role || null;
  },
  set: function (newRole) {
    if (newRole !== null) {
      this.memory.role = newRole;
    } else {
      delete this.memory.role;
    }
  }
});

Object.defineProperty(Creep.prototype, "target", {
  get: function () {
    return this.memory.target || null;
  },
  set: function (newTarget) {
    if (newTarget !== null) {
      this.memory.target = newTarget;
    } else {
      delete this.memory.target;
    }
  }
});

Creep.prototype.getTarget = function () {
  return Game.getObjectById(this.target);
};

Object.defineProperty(Source.prototype, "defended", {
  get: function () {
    if (this.memory.defended) {
      return this.memory.defended;
    }
    let RANGE = 5;
    let targets = this.pos.findInRange(FIND_HOSTILE_STRUCTURES, RANGE);
    if (targets.length) {
      this.memory.defended = true;
      return true;
    }
    this.memory.defended = false;
    return false;
  }
});

Object.defineProperty(Source.prototype, 'container', {
  get: function () {
    if (this._container == undefined) {
      if (this.memory.containerID == undefined) {
        //TODO: Is calculated every time during container is build // Split to 2 functions/prototypes
        // During construction containerID = null
        Log.info(`No ContainerPos found in memory`, "Container");
        let [found] = this.pos.findInRange(FIND_STRUCTURES, 2, {
          filter: {
            structureType: STRUCTURE_CONTAINER
          }
        });
        if (found) {
          Log.info(`Container found -> Memory`, "Container");
          this.memory.containerID = found.id;
          this._container = Game.getObjectById(found.id);
          return this._container;
        }

        if (found == undefined) {
          let [found] = this.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
            filter: {
              structureType: STRUCTURE_CONTAINER
            }
          });
          if (found) {
            Log.info(`Container Construction Site is returned`, "Container");
            this._container = Game.getObjectById(found.id);
            return this._container;
          }
        }

        Log.info(`ContainerPos will be calculated`, "Container");
        this.calculateContainerPos(1);
        Log.info(`ContainerPos calculated and build order given`, "Container");
        this._container = null;

      }
      if (Game.getObjectById(this.memory.containerID)) {
        this._container = Game.getObjectById(this.memory.containerID);
      } else {
        Log.info(`Container does not exist anymore. Delete from memory`, "Container");
        this.memory.containerID = null;
        this._container = null;
      }
    }
    return this._container;
  },
  enumerable: false,
  configurable: true
});

Object.defineProperty(Source.prototype, 'memory', {
  get: function () {
    if (!Memory.rooms[this.room.name].sources)
      Memory.rooms[this.room.name].sources = {};
    if (!Memory.rooms[this.room.name].sources[this.id])
      Memory.rooms[this.room.name].sources[this.id] = {};
    return Memory.rooms[this.room.name].sources[this.id];
  },
  set: function (v) {
    if (!Memory.rooms[this.room.name].sources)
      Memory.rooms[this.room.name].sources = {};
    return Memory.rooms[this.room.name].sources[this.id] = v;
  }
});

Object.defineProperty(Structure.prototype, 'container', {
  get: function () {
    if (this._container == undefined) {
      if (this.memory.containerID == undefined) {
        Log.info(`No ContainerPos found in memory`, "Container");
        let [found] = this.pos.findInRange(FIND_STRUCTURES, 2, {
          filter: {
            structureType: STRUCTURE_CONTAINER
          }
        });

        if (found == undefined) {
          let [found] = this.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
            filter: {
              structureType: STRUCTURE_CONTAINER
            }
          });
        }

        if (found !== undefined) {
          Log.info(`Container found -> Memory`, "Container");
          this.memory.containerID = found.id;
        } else {
          Log.info(`ContainerPos will be calculated`, "Container");
          this.calculateContainerPos(1);
          Log.info(`ContainerPos calculated and build order given`, "Container");
          this._container = null;
        }
      }
      if (Game.getObjectById(this.memory.containerID)) {
        this._container = Game.getObjectById(this.memory.containerID);
      } else {
        Log.info(`Container does not exist anymore. Delete from memory`, "Container");
        this.memory.containerID = null;
        this._container = null;
      }
    }
    return this._container;
  },
  enumerable: false,
  configurable: true
});

Object.defineProperty(Structure.prototype, 'memory', {
  get: function () {
    if (!Memory.rooms[this.room.name].structures)
      Memory.rooms[this.room.name].structures = {};
    if (!Memory.rooms[this.room.name].structures[`${this.structureType}s`])
      Memory.rooms[this.room.name].structures[`${this.structureType}s`] = {};
    if (!Memory.rooms[this.room.name].structures[`${this.structureType}s`][this.id])
      Memory.rooms[this.room.name].structures[`${this.structureType}s`][this.id] = {};
    return Memory.rooms[this.room.name].structures[`${this.structureType}s`][this.id];
  },
  set: function (v) {
    if (!Memory.rooms[this.room.name].structures)
      Memory.rooms[this.room.name].structures = {};
    if (!Memory.rooms[this.room.name].structures[`${this.structureType}s`])
      Memory.rooms[this.room.name].structures[`${this.structureType}s`] = {};
    return Memory.rooms[this.room.name].structures[`${this.structureType}s`][this.id] = v;
  }
});

Structure.prototype.needsRepair = function () {
  //"Repair" walls + ramparts until Limit (maxHitsDefense) is reached
  if (this.structureType == STRUCTURE_RAMPART || this.structureType == STRUCTURE_WALL) {
    let max = global.getFixedValue('maxHitsDefense');
    return (this.hits < max) && (this.hits < this.hitsMax) && (this.hitsMax > 1);
  }
  // Repair remaining stuff if HP is under 90%
  let repairLimit = global.getFixedValue('repairLimit');
  return this.hits < (this.hitsMax * repairLimit);
};


Room.prototype.getResourceAmount = function (res) {
  var amount = 0;
  if (this.storage && this.storage.store[res]) {
    amount += this.storage.store[res];
  }
  if (this.terminal && this.terminal.store[res]) {
    amount += this.terminal.store[res];
  }
  return amount;
};


Object.defineProperty(Room.prototype, 'mineral', {
  get: function () {
    if (this == Room.prototype || this == undefined)
      return undefined;
    this.memory.mineral = {};
    if (!this._mineral) {
      if (this.memory.mineral.mineralId === undefined) {
        let [theMineral] = this.find(FIND_MINERALS);
        if (!theMineral) {
          return this.memory.mineral.mineralId = null;
        }
        this._mineral = theMineral;
        this.memory.mineral.mineralId = theMineral.id;
      } else {
        this._mineral = Game.getObjectById(this.memory.mineral.mineralId);
      }
    }
    return this._mineral;
  },
  enumerable: false,
  configurable: true
});

Object.defineProperty(RoomPosition.prototype, 'freeFieldsCount', {
  get: function () {
    var self = this;

    let freeSpaceCount = 0;
    [this.x - 1, this.x, this.x + 1].forEach(x => {
      [this.y - 1, this.y, this.y + 1].forEach(y => {
        if (!(x == self.x && self.y == y)) {
          let [found] = this.lookFor(LOOK_STRUCTURES, x, y);
          if (Game.map.getRoomTerrain(x, y, this.roomName) != 'wall')
            freeSpaceCount++;
        }
      }, this);
    }, this);
    return freeSpaceCount;
  },
  enumerable: false,
  configurable: true
});

RoomObject.prototype.calculateContainerPos = function (range) {
  if (this.room.controller.reservation &&
    /* reserved and not mine */
    this.room.controller.reservation.username != Game.structures[_.first(Object.keys(Game.structures))].owner.username) {
    console.log(`Unable to place container in ${this.room}, hostile reserved room`);
    return;
  }
  if (this.structureType === STRUCTURE_CONTROLLER) {
    range = 2;
  }
  var startingPosition = this.room.find(FIND_MY_SPAWNS)[0];
  Log.info(`Calculation Container Pos. Start at ${startingPosition}`, "Container");
  if (!startingPosition) {
    startingPosition = this.room.find(FIND_CONSTRUCTION_SITES, {
      filter: (function (s) {
        return s.structureType === STRUCTURE_SPAWN;
      })
    })[0];
  }
  if (!startingPosition) {
    Log.info(`No starting Position`, "Container");
    return;
  }
  if (this.pos.findInRange(FIND_CONSTRUCTION_SITES, range).length > 0)
    return;
  var ret = PathFinder.search(this.pos, startingPosition, {
    maxOps: 4000,
    swampCost: 2,
    plainCost: 2,
  });
  if (ret.incomplete || ret.path.length === 0) {
    console.log("path used for container placement in calculateContainerPos incomplete, please investigate");
    return;
  }
  var position_1 = ret.path[range - 1];
  Log.info(`New container Postition ${position_1}`, "Container");

  position_1.createConstructionSite(STRUCTURE_CONTAINER);
  Log.info(`Placed Container in ${this.room}`, "Container");
  return position_1;
};

RoomObject.prototype.say = function (what) {
  this.room.visual.line(this.pos.x, this.pos.y, this.pos.x + 1 - 0.2, this.pos.y - 1, {
    // Line from object to message bubble
    color: "#eeeeee",
    opacity: 0.9,
    width: 0.1
  }).circle(this.pos, {
    // Small dot marker at the top of object
    fill: "#aaffaa",
    opacity: 0.9
  }).text(what, this.pos.x + 1, this.pos.y - 1, {
    // Fake message, used to align background (to make black border)
    color: "black",
    opacity: 0.9,
    align: "left",
    font: "bold 0.6 Arial",
    backgroundColor: "black",
    backgroundPadding: 0.3
  }).text(what, this.pos.x + 1, this.pos.y - 1, {
    // Real message
    color: "black",
    opacity: 0.9,
    align: "left",
    font: "bold 0.6 Arial",
    backgroundColor: "#eeeeee",
    backgroundPadding: 0.2
  });
};

RoomPosition.prototype.toString = function (htmlLink = true, id = undefined) {
  if (htmlLink) {
    var onClick = '';
    if (id) onClick += `angular.element('body').injector().get('RoomViewPendingSelector').set('${id}');` +
      `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${id}')[0]);`
    return `<a href="#!/room/${Game.shard.name}/${this.roomName}" onClick="${onClick}">[${ this.roomName } ${ this.x },${ this.y }]</a>`;
  }
  return `[${ this.roomName } ${ this.x },${ this.y }]`;
};

Creep.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = '';
    if (this.id) onClick += `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
      `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${(this.name ? this.name : this.id)}]</a>`;
  }
  return `[${(this.name ? this.name : this.id)}]`;
};

Structure.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = '';
    if (this.id) onClick += `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
      `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${(this.structureType ? this.structureType : this.id)}]</a>`;
  }
  return `[(${this.structureType}) #${this.id}]`;
};

StructureSpawn.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = '';
    if (this.id) onClick += `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
      `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${(this.name ? this.name : this.id)}]</a>`;
  }
  return `[(${this.structureType}) #${this.id}]`;
};