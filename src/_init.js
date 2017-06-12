require("_initGlobal")(global);

/**
 * Extend Creep
 */

if ( Creep && Creep.prototype && !Creep.prototype.behavior ) {
    
Object.defineProperty(Creep.prototype, "behavior", {
  get: function() {
    return this.memory.behavior || null;
  },
  set: function(newBehavior) {
    if (newBehavior !== null) {
      this.memory.behavior = newBehavior;
    } else {

      delete this.memory.behavior;
    }
    this.target = null;
  }
});

Object.defineProperty(Creep.prototype, "energy", {
  get : function() {
    return this.carry.energy;
  }
});

Object.defineProperty(Creep.prototype, "energyCapacity", {
  get : function() {
    return this.carryCapacity;
  }
});

Object.defineProperty(Creep.prototype, "role", {
  get: function() {
    return this.memory.role || null;
  },
  set: function(newRole) {
    if (newRole !== null) {
      this.memory.role = newRole;
    } else {
      delete this.memory.role;
    }
  }
});

Object.defineProperty(Creep.prototype, "target", {
  get: function() {
    return this.memory.target || null;
  },
  set: function(newTarget) {
    if (newTarget !== null) {
      this.memory.target = newTarget;
    } else {
      delete this.memory.target;
    }
  }
});

Creep.prototype.getTarget = function() {
  return Game.getObjectById(this.target);
};

Creep.prototype.isNearTo = function(t) {
  return creep.pos.isNearTo(t);
};

Creep.prototype.moveToEx = function(target) {
  if (this.fatigue === 0) {
    this.moveTo(target, {
      'reusePath' : 15,
      // 'noPathFinding' : true,
      'maxOps': 1000,
      visualizePathStyle : {
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

Creep.prototype.hasActiveBodyparts = function (type) {
    for (var i = this.body.length; i-- > 0;) {
        if (this.body[i].hits > 0) {
            if (this.body[i].type === type) {
                return true;
            }
        } else break;
    }
    return false;
};

/**
 * Extend source
 */

Object.defineProperty(Source.prototype, "defended", {
  get: function() {
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

Structure.prototype.needsRepair = function() {
  if (this.structureType == STRUCTURE_RAMPART || this.structureType == STRUCTURE_WALL) {
    return (this.hits < 5000000) && (this.hitsMax > 1);
  }
  return this.hits < (this.hitsMax / 2);
};

Structure.prototype.getFreeFields = function() {
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
        get: function() {
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
}