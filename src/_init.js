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
      return this.carry.energy;
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

  Creep.prototype.moveToEx = function (target) {
    if (this.fatigue === 0) {
      this.moveTo(target, {
        'reusePath': 15,
        // 'noPathFinding' : true,
        'maxOps': 1000,
        visualizePathStyle: {
          fill: 'transparent',
          stroke: '#fff',
          lineStyle: 'dashed',
          strokeWidth: .15,
          opacity: .1
        }
      });
    }
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

  /**
   * Extend source
   */

  Object.defineProperty(Source.prototype, "defended", {
    get: function () {
      var RANGE = 5;

      var targets = this.pos.findInRange(FIND_HOSTILE_CREEPS, RANGE);
      if (targets.length) {
        return true;
      }

      targets = this.pos.findInRange(FIND_HOSTILE_STRUCTURES, RANGE);
      if (targets.length) {
        return true;
      }

      return false;
    }
  });

  /*Object.defineProperty(Source.prototype, 'sourceContainer', {
    get: function () {
      if (this == Source.prototype || this == undefined)
        return undefined;
      if (!this._source) {
        if (this.memory.sourceContainer === undefined) {
          let container = _.filter(this.find(FIND_STRUCTURES), function (f) {
            return f.structureType === STRUCTURE_CONTAINER && f.pos.inRangeTo(this.pos, 1)
          });
          if (!container) {
            return this.memory.sourceContainer = null;
          }
          this._source = container;
          this.memory.sourceContainer = container.id;
        } else {
          this._source = Game.getObjectById(this.memory.sourceContainer);
        }
      }
      return this._source;
    },
    enumerable: false,
    configurable: true
  });
*/
  Object.defineProperty(Source.prototype, 'memory', {
    configurable: true,
    get: function () {
      if (_.isUndefined(Memory.mySourcesMemory)) {
        Memory.mySourcesMemory = {};
      }
      if (!_.isObject(Memory.mySourcesMemory)) {
        return undefined;
      }
      return Memory.mySourcesMemory[this.id] =
        Memory.mySourcesMemory[this.id] || {};
    },
    set: function (value) {
      if (_.isUndefined(Memory.mySourcesMemory)) {
        Memory.mySourcesMemory = {};
      }
      if (!_.isObject(Memory.mySourcesMemory)) {
        throw new Error('Could not set source memory');
      }
      Memory.mySourcesMemory[this.id] = value;
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

  // Unlimited walls+rampart upgrade. Rest only when HP < 66%
  Structure.prototype.needsRepair = function () {
    if (this.structureType == STRUCTURE_RAMPART || this.structureType == STRUCTURE_WALL) {
      return (this.hits < this.hitsMax) && (this.hitsMax > 1);
    }
    return this.hits < (this.hitsMax * 0.9);
  };

  Structure.prototype.getFreeFields = function () {
    if (this.structureType !== STRUCTURE_CONTROLLER) return 0;

    if (!this.room.memory.maxUpgraders) {
      var pos = this.pos;
      var count = 0;

      for (var x = -1; x < 2; x++) {
        for (var y = -1; y < 2; y++) {
          var terrain = this.room.lookForAt('terrain', pos.x + x, pos.y + y);
          if (terrain.length && terrain[0] != 'wall') {
            count++;
          }
        }
      }
      this.room.memory.maxUpgraders = count;
    }

    return this.room.memory.maxUpgraders || 0;
  };

  /**
   * Defines a .mineral property for rooms that caches and gives you the mineral object for a room
   * Author: Helam
   */
  Object.defineProperty(Room.prototype, 'mineral', {
    get: function () {
      if (this == Room.prototype || this == undefined)
        return undefined;
      if (!this._mineral) {
        if (this.memory.mineralId === undefined) {
          let [mineral] = this.find(FIND_MINERALS);
          if (!mineral) {
            return this.memory.mineralId = null;
          }
          this._mineral = mineral;
          this.memory.mineralId = mineral.id;
        } else {
          this._mineral = Game.getObjectById(this.memory.mineralId);
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
        if (this.memory.mineralContainer === undefined) {
          let [mineral] = this.find(FIND_MINERALS);
          let container = _.filter(this.find(FIND_STRUCTURES), function (f) {
            return f.structureType === STRUCTURE_CONTAINER && f.pos.inRangeTo(mineral.pos, 1)
          });
          if (!container) {
            return this.memory.mineralContainer = null;
          }
          this._mineral = container;
          this.memory.mineralContainer = container.id;
        } else {
          this._mineral = Game.getObjectById(this.memory.mineralContainer);
        }
      }
      return this._mineral;
    },
    enumerable: false,
    configurable: true
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