require("_initGlobal")(global);

/**
 * Extend Creep
 */

if (Creep && Creep.prototype && !Creep.prototype.behavior) {

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
      return _.sum(this.carry);
    }
  });

  Object.defineProperty(Creep.prototype, "energyCapacity", {
    get: function () {
      return this.carryCapacity;
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

  Creep.prototype.transferAllResources = function (structure) {
    let transferred = false;
    for (let resource in this.carry) {
      if (!resource) {
        continue;
      }
      let returnCode = this.transfer(structure, resource);
      if (returnCode === OK) {
        // let  allResources = Math.min(this.carry[resource], structure.energyCapacity - structure.energy);
        transferred = true;
      }
    }
    return transferred;
  };

  Creep.prototype.withdrawAllResources = function (structure) {
    let transferred = false;
    for (let resource in structure.store) {
      if (!resource) {
        continue;
      }

      let returnCode = this.withdraw(structure, resource);
      if (returnCode === OK) {
        // transferred = Math.min(this.carry[resource], structure.energyCapacity - structure.energy);
        transferred = true;
      }
    }
    return transferred;
  };

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
        if (this.memory.container == undefined) {
          [this.pos.x - 1, this.pos.x, this.pos.x + 1].forEach(x => {
            [this.pos.y - 1, this.pos.y, this.pos.y + 1].forEach(y => {
              let [found] = this.room.lookForAt(LOOK_STRUCTURES, x, y);
              if (found !== undefined && found.structureType === 'container') {
                this.memory.container = found.id;
              }
            }, this);
          }, this);
        }
        this._container = Game.getObjectById(this.memory.container);
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

  Object.defineProperty(Structure.prototype, 'dropEnergy', {
    get: function () {
      if (this._dropEnergy == undefined) {
        if (this.memory.dropEnergy == undefined) {
          [this.pos.x - 2, this.pos.x - 1, this.pos.x, this.pos.x + 1, this.pos.x + 2].forEach(x => {
            [this.pos.y - 2, this.pos.y - 1, this.pos.y, this.pos.y + 1, this.pos.y + 2].forEach(y => {
              let pos = new RoomPosition(x, y, this.room.name);
              let count = pos.freeFieldsCount;
              console.log("Pos: " + pos + " Count: " + count);
              if (count == 8) {
                this.memory.dropEnergy = {
                  x: pos.x,
                  y: pos.y,
                  roomName: pos.roomName
                };
              }
            }, this);
          }, this);
        }
        this._dropEnergy = this.memory.dropEnergy;
      }
      return this._dropEnergy;
    },
    enumerable: false,
    configurable: true
  });

  Object.defineProperty(Structure.prototype, 'container', {
    get: function () {
      if (this._container == undefined) {
        if (this.memory.containerID == undefined) {
          let [found] = this.pos.findInRange(FIND_STRUCTURES, 2, {
            filter: {
              structureType: STRUCTURE_CONTAINER
            }
          });
          if (found !== undefined) {
            this.memory.containerID = found.id;
          }
        } else {
          this.calculateContainerPos(1);
          console.log("ContainerPos calculated and build order given");
          this._container = null;
        }
        this._container = Game.getObjectById(this.memory.containerID);
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

  Object.defineProperty(Room.prototype, 'mineral', {
    get: function () {
      if (this == Room.prototype || this == undefined)
        return undefined;
      // Mit if ?
      this.memory._mineral = {};
      if (!this._mineral) {
        if (this.memory._mineral.mineralId === undefined) {
          let [mineral] = this.find(FIND_MINERALS);
          if (!mineral) {
            return this.memory._mineral.mineralId = null;
          }
          this._mineral = mineral;
          this.memory._mineral.mineralId = mineral.id;
        } else {
          this._mineral = Game.getObjectById(this.memory._mineral.mineralId);
        }
      }
      return this._mineral;
    },
    enumerable: false,
    configurable: true
  });

  Object.defineProperty(Room.prototype, 'mineralContainer', {
    get: function () {
      if (this == Room.prototype || this == undefined)
        return undefined;

      if (!this._mineral) {
        if (this.memory._mineral.mineralContainer === undefined) {
          let [mineral] = this.find(FIND_MINERALS);
          let container = _.filter(this.find(FIND_STRUCTURES), function (f) {
            return f.structureType === STRUCTURE_CONTAINER && f.pos.inRangeTo(mineral.pos, 1)
          });
          console.log(container);
          if (!container) {
            return this.memory._mineral.mineralContainer = null;
          }
          this._mineral = container[0];
          console.log("Container ID: " + container[0].id);
          this.memory._mineral.mineralContainer = container[0].id;
        } else {
          this._mineral = Game.getObjectById(this.memory._mineral.mineralContainer);
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
            if (Game.map.getTerrainAt(x, y, this.roomName) != 'wall')
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
      console.log(`MINER: Unable to place container in ${this.operation.name}, hostile reserved room`);
      return;
    }
    var startingPosition = this.room.find(FIND_MY_SPAWNS)[0];
    console.log("Calculate Container Position?: " + startingPosition);
    if (!startingPosition) {
      startingPosition = this.room.find(FIND_CONSTRUCTION_SITES, {
        filter: (function (s) {
          return s.structureType === STRUCTURE_SPAWN;
        })
      })[0];
    }
    if (!startingPosition)
      return;
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
    console.log("Position1: " + position_1);
    /* var testPositions = _.sortBy(this.pos.openAdjacentSpots(true), function (p) {
      return p.getRangeTo(position_1);
    });
    for (var _i = 0, testPositions_1 = testPositions; _i < testPositions_1.length; _i++) {
      var testPosition = testPositions_1[_i];
      var sourcesInRange = testPosition.findInRange(FIND_SOURCES, 1);
      if (sourcesInRange.length > 1) {
        continue;
      } */
    position_1.createConstructionSite(STRUCTURE_CONTAINER);
    // this.memory.containerPos = position_1;
    console.log("Placed container in " + this.room);
    return position_1;
  };

  RoomObject.prototype.lookForNear = function (lookFor, asArray, range = 1) {
    var {
      x,
      y
    } = this.pos;
    return this.room.lookForAtArea(lookFor,
      Math.max(0, y - range),
      Math.max(0, x - range),
      Math.min(49, y + range),
      Math.min(49, x + range),
      asArray);
  };

  RoomObject.prototype.lookNear = function (asArray, range = 1) {
    var {
      x,
      y
    } = this.pos;
    return this.room.lookAtArea(Math.max(0, y - range),
      Math.max(0, x - range),
      Math.min(49, y + range),
      Math.min(49, x + range),
      asArray);
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

  Creep.prototype.toString = function (htmlLink = true) {
    return `[${(this.name ? this.name : this.id)} ${this.pos.toString(htmlLink, this.id)}]`;
  };

  Structure.prototype.toString = function (htmlLink = true) {
    return `[structure (${this.structureType}) #${this.id} ${this.pos.toString(htmlLink, this.id)}]`;
  };

  StructureSpawn.prototype.toString = function (htmlLink = true) {
    return `[structure (${this.structureType}) #${this.id} ${this.pos.toString(htmlLink, this.id)}]`;
  };

}