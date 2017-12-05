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

  Creep.prototype.hasActiveBodypart = function (type) {
    var i;
    for (i = this.body.length - 1; i >= 0; i--) {
      if (this.body[i].hits <= 0)
        break;
      if (this.body[i].type === type)
        return true;
    }
    return false;
  };

  Creep.prototype.withdrawAllResources = function (structure) {
    let transferred = false;
    for (let resource in structure.store) {
      if (!resource) {
        continue;
      }
      /*if (resource === RESOURCE_ENERGY || resource === RESOURCE_POWER) {
        continue;
      }*/

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

  Creep.prototype.isNearTo = function (t) {
    return this.pos.isNearTo(t);
  };

  Creep.prototype.getActiveBodyparts = function (type) {
    var count = 0;
    for (var i = this.body.length; i-- > 0;) {
      if (this.body[i].hits > 0) {
        if (this.body[i].type === type) {
          count++;
        }
      } else break;
    }
    return count;
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

  Object.defineProperty(Source.prototype, 'freeSpaceCount', {
    get: function () {
      if (this._freeSpaceCount == undefined) {
        if (this.memory.freeSpaceCount == undefined) {
          let freeSpaceCount = 0;
          [this.pos.x - 1, this.pos.x, this.pos.x + 1].forEach(x => {
            [this.pos.y - 1, this.pos.y, this.pos.y + 1].forEach(y => {
              if (Game.map.getTerrainAt(x, y, this.pos.roomName) != 'wall')
                freeSpaceCount++;
            }, this);
          }, this);
          this.memory.freeSpaceCount = freeSpaceCount;
        }
        this._freeSpaceCount = this.memory.freeSpaceCount;
      }
      return this._freeSpaceCount;
    },
    enumerable: false,
    configurable: true
  });

  Object.defineProperty(Source.prototype, 'container', {
    get: function () {
      if (this._container == undefined) {
        if (this.memory.container == undefined) {
          [this.pos.x - 1, this.pos.x, this.pos.x + 1].forEach(x => {
            [this.pos.y - 1, this.pos.y, this.pos.y + 1].forEach(y => {
              let [found] = this.room.lookForAt(LOOK_STRUCTURES, x, y);
              if (found !== undefined && found.structureType === 'container') {
                console.log("In the zone writing " + found.id + " in " + this.memory.container);
                this.memory.container = found.id;
              }
            }, this);
          }, this);
        }
        this._container = this.memory.container;
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

  Object.defineProperty(Controller.prototype, 'container', {
    get: function () {
      if (this._container == undefined) {
        if (this.memory.container == undefined) {
          [this.pos.x - 1, this.pos.x, this.pos.x + 1].forEach(x => {
            [this.pos.y - 1, this.pos.y, this.pos.y + 1].forEach(y => {
              let [found] = this.room.lookForAt(LOOK_STRUCTURES, x, y);
              if (found !== undefined && found.structureType === 'container') {
                console.log("In the zone writing " + found.id + " in " + this.memory.container);
                this.memory.container = found.id;
              }
            }, this);
          }, this);
        }
        this._container = this.memory.container;
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
    if (this.structureType == STRUCTURE_RAMPART || this.structureType == STRUCTURE_WALL) {
      let max = global.getInterval('maxHitsDefense');
      return (this.hits < max) && (this.hits < this.hitsMax) && (this.hitsMax > 1);
    }
    return this.hits < (this.hitsMax * 0.9);
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

  RoomPosition.prototype.toString = function (htmlLink = true, id = undefined) {
    if (htmlLink) {
      var onClick = '';
      if (id) onClick += `angular.element('body').injector().get('RoomViewPendingSelector').set('${id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${id}')[0]);`
      return `<a href="#!/room/${this.roomName}" onClick="${onClick}">[${ this.roomName } ${ this.x },${ this.y }]</a>`;
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
  }

  Structure.prototype.toString = function (htmlLink = true) {
    return `[structure (${this.structureType}) #${this.id} ${this.pos.toString(htmlLink, this.id)}]`;
  }

  StructureSpawn.prototype.toString = function (htmlLink = true) {
    return `[structure (${this.structureType}) #${this.id} ${this.pos.toString(htmlLink, this.id)}]`;
  }

}