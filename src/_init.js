require("_initGlobal")(global);
const CONSTANTS = require("./constants");
const Log = require("Log");

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
  },
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
  },
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
  },
});

Creep.prototype.getTarget = function () {
  return Game.getObjectById(this.target);
};

/**
 * Multiple targets system
 * Each target contains: { id: string, action: "withdraw"|"transfer", resourceType: string, amount: number }
 */
Object.defineProperty(Creep.prototype, "targets", {
  get: function () {
    if (!this.memory.targets) {
      this.memory.targets = [];
    }
    return this.memory.targets;
  },
  set: function (newTargets) {
    if (Array.isArray(newTargets)) {
      this.memory.targets = newTargets;
    } else {
      this.memory.targets = [];
    }
  },
});

/**
 * Add a target to the queue
 * @param {string} id - Target object ID
 * @param {string} action - "withdraw" or "transfer"
 * @param {string} resourceType - Resource type (e.g., RESOURCE_ENERGY)
 * @param {number} amount - Amount to withdraw/transfer
 */
Creep.prototype.addTarget = function (id, action, resourceType, amount) {
  if (!this.memory.targets) {
    this.memory.targets = [];
  }
  this.memory.targets.push({
    id: id,
    action: action,
    resourceType: resourceType,
    amount: amount || 0,
  });
};

/**
 * Remove the first target from the queue
 */
Creep.prototype.removeFirstTarget = function () {
  if (this.memory.targets && this.memory.targets.length > 0) {
    this.memory.targets.shift();
  }
};

/**
 * Clear all targets
 */
Creep.prototype.clearTargets = function () {
  this.memory.targets = [];
};

/**
 * Get the first target as an object
 * @returns {Object|null} The target object or null
 */
Creep.prototype.getFirstTarget = function () {
  if (this.memory.targets && this.memory.targets.length > 0) {
    const targetData = this.memory.targets[0];
    return Game.getObjectById(targetData.id);
  }
  return null;
};

/**
 * Get the first target data (id, action, resourceType, amount)
 * @returns {Object|null} The target data or null
 */
Creep.prototype.getFirstTargetData = function () {
  if (this.memory.targets && this.memory.targets.length > 0) {
    return this.memory.targets[0];
  }
  return null;
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
  },
});

Object.defineProperty(Source.prototype, "container", {
  get: function () {
    if (this._container == undefined) {
      // Check if container ID is stored in memory
      if (this.memory.containerID) {
        const container = Game.getObjectById(this.memory.containerID);
        if (container) {
          this._container = container;
          return this._container;
        } else {
          // Container no longer exists, delete ID from memory
          Log.debug(`Container does not exist anymore. Delete from memory`, "Container");
          this.memory.containerID = null;
        }
      }
      
      // Search for existing container nearby
      const [found] = this.pos.findInRange(FIND_STRUCTURES, 2, {
        filter: { structureType: STRUCTURE_CONTAINER },
      });

      if (found) {
        Log.debug(`Container found -> Memory`, "Container");
        this.memory.containerID = found.id;
        this._container = found;
      } else {
        // No container present - RoomPlanner will create it
        this._container = null;
      }
    }
    return this._container;
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(Source.prototype, "memory", {
  get: function () {
    if (!Memory.rooms[this.room.name].sources) Memory.rooms[this.room.name].sources = {};
    if (!Memory.rooms[this.room.name].sources[this.id]) Memory.rooms[this.room.name].sources[this.id] = {};
    return Memory.rooms[this.room.name].sources[this.id];
  },
  set: function (v) {
    if (!Memory.rooms[this.room.name].sources) Memory.rooms[this.room.name].sources = {};
    return (Memory.rooms[this.room.name].sources[this.id] = v);
  },
});

Object.defineProperty(Structure.prototype, "container", {
  get: function () {
    if (this._container == undefined) {
      // Check if container ID is stored in memory
      if (this.memory.containerID) {
        const container = Game.getObjectById(this.memory.containerID);
        if (container) {
          this._container = container;
          return this._container;
        } else {
          // Container no longer exists, delete ID from memory
          Log.debug(`Container does not exist anymore. Delete from memory`, "Container");
          this.memory.containerID = null;
        }
      }
      
      // Search for existing container nearby
      const [found] = this.pos.findInRange(FIND_STRUCTURES, 2, {
        filter: { structureType: STRUCTURE_CONTAINER },
      });

      if (found) {
        Log.debug(`Container found -> Memory`, "Container");
        this.memory.containerID = found.id;
        this._container = found;
      } else {
        // No container present - RoomPlanner will create it
        this._container = null;
      }
    }
    return this._container;
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(Structure.prototype, "memory", {
  get: function () {
    if (!Memory.rooms[this.room.name].structures) Memory.rooms[this.room.name].structures = {};
    if (!Memory.rooms[this.room.name].structures[`${this.structureType}s`]) Memory.rooms[this.room.name].structures[`${this.structureType}s`] = {};
    if (!Memory.rooms[this.room.name].structures[`${this.structureType}s`][this.id]) Memory.rooms[this.room.name].structures[`${this.structureType}s`][this.id] = {};
    return Memory.rooms[this.room.name].structures[`${this.structureType}s`][this.id];
  },
  set: function (v) {
    if (!Memory.rooms[this.room.name].structures) Memory.rooms[this.room.name].structures = {};
    if (!Memory.rooms[this.room.name].structures[`${this.structureType}s`]) Memory.rooms[this.room.name].structures[`${this.structureType}s`] = {};
    return (Memory.rooms[this.room.name].structures[`${this.structureType}s`][this.id] = v);
  },
});

Structure.prototype.needsRepair = function () {
  //"Repair" walls + ramparts until Limit (room.memory.wallHits) is reached
  if (this.structureType == STRUCTURE_RAMPART || this.structureType == STRUCTURE_WALL) {
    if (this.room.memory.wallHits) {
      // Should I repair/upgrade walls + ramparts?
      return this.hits < this.room.memory.wallHits && this.hits < this.hitsMax && this.hitsMax > 1;
    } else {
      // initialse Walls HPs to repair
      this.room.memory.wallHits = CONSTANTS.RESOURCES.WALL_HITS_INITIAL;
    }
  }
  // Repair remaining stuff if HP is under repairLimit (~90%)
  return this.hits < this.hitsMax * CONSTANTS.DEFENSE.REPAIR_LIMIT;
};

Structure.prototype.getFirstMineral = function () {
  if (!this.store) {
    return { amount: 0 };
  }
  // Use for..in for early exit (more efficient than _.each)
  for (const resourceType in this.store) {
    if (resourceType !== RESOURCE_ENERGY && this.store[resourceType] > 0) {
      return {
        resource: resourceType,
        amount: this.store[resourceType],
      };
    }
  }
  return { amount: 0 };
};

const ResourceManager = require("ResourceManager");

Room.prototype.getResourceAmount = function (res, structure = "all") {
  return ResourceManager.getResourceAmount(this, res, structure);
};

Room.prototype.roomNeedResources = function () {
  if (!this._needResources) {
    this._needResources = ResourceManager.getRoomNeeds(this);
  }
  return this._needResources;
};

Room.prototype.getRoomThreshold = function (resource, structure = "all") {
  return ResourceManager.getRoomThreshold(resource, structure);
};

// Wrapper für Fälle ohne Room-Kontext (z.B. in _initGlobal.js)
global.getRoomThreshold = function (resource, structure = "all") {
  return ResourceManager.getRoomThreshold(resource, structure);
};

Object.defineProperty(Room.prototype, "mineral", {
  get: function () {
    if (this == Room.prototype || this == undefined) return undefined;
    // Cache for current tick
    if (this._mineral !== undefined) {
      return this._mineral;
    }
    // Initialize memory structure only if it doesn't exist
    if (!this.memory.mineral) {
      this.memory.mineral = {};
    }
    if (this.memory.mineral.mineralId === undefined) {
      let [theMineral] = this.find(FIND_MINERALS);
      if (!theMineral) {
        this.memory.mineral.mineralId = null;
        this._mineral = null;
        return null;
      }
      this._mineral = theMineral;
      this.memory.mineral.mineralId = theMineral.id;
    } else {
      this._mineral = Game.getObjectById(this.memory.mineral.mineralId);
      // If mineral no longer exists, clear cache
      if (!this._mineral) {
        this.memory.mineral.mineralId = undefined;
      }
    }
    return this._mineral;
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(RoomPosition.prototype, "freeFieldsCount", {
  get: function () {
    const terrain = Game.map.getRoomTerrain(this.roomName);
    let freeSpaceCount = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = this.x + dx;
        const y = this.y + dy;
        // Check bounds
        if (x < 0 || x > 49 || y < 0 || y > 49) continue;
        // TERRAIN_MASK_WALL = 1
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          freeSpaceCount++;
        }
      }
    }
    return freeSpaceCount;
  },
  enumerable: false,
  configurable: true,
});

/**
 * Counts free spaces around a source (excluding walls and blocking structures)
 * Roads and containers are allowed as they don't block harvesting
 */
Object.defineProperty(Source.prototype, "freeSpacesCount", {
  get: function () {
    const terrain = Game.map.getRoomTerrain(this.room.name);
    let freeSpaces = 0;
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip the source position itself
        
        const x = this.pos.x + dx;
        const y = this.pos.y + dy;
        
        // Check bounds
        if (x < 0 || x > 49 || y < 0 || y > 49) continue;
        
        // Check if terrain is walkable (not a wall)
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
        
        // Check if there's a structure blocking the position
        // @ts-ignore - lookForAt works correctly at runtime
        const structures = this.room.lookForAt(LOOK_STRUCTURES, x, y);
        const hasBlockingStructure = structures.some(s => 
          s.structureType !== STRUCTURE_ROAD && 
          s.structureType !== STRUCTURE_CONTAINER
        );
        
        if (!hasBlockingStructure) {
          freeSpaces++;
        }
      }
    }
    
    return freeSpaces;
  },
  enumerable: false,
  configurable: true,
});

// calculateContainerPos was removed - Container creation now happens via RoomPlanner.js

RoomObject.prototype.say = function (what) {
  this.room.visual
    .line(this.pos.x, this.pos.y, this.pos.x + 1 - 0.2, this.pos.y - 1, {
      // Line from object to message bubble
      color: "#eeeeee",
      opacity: 0.9,
      width: 0.1,
    })
    .circle(this.pos, {
      // Small dot marker at the top of object
      fill: "#aaffaa",
      opacity: 0.9,
    })
    .text(what, this.pos.x + 1, this.pos.y - 1, {
      // Fake message, used to align background (to make black border)
      color: "black",
      opacity: 0.9,
      align: "left",
      font: "bold 0.6 Arial",
      backgroundColor: "black",
      backgroundPadding: 0.3,
    })
    .text(what, this.pos.x + 1, this.pos.y - 1, {
      // Real message
      color: "black",
      opacity: 0.9,
      align: "left",
      font: "bold 0.6 Arial",
      backgroundColor: "#eeeeee",
      backgroundPadding: 0.2,
    });
};

RoomPosition.prototype.toString = function (htmlLink = true, id = undefined) {
  if (htmlLink) {
    var onClick = "";
    if (id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${id}')[0]);`;
    return `<a href="#!/room/${Game.shard.name}/${this.roomName}" onClick="${onClick}">[${this.roomName} ${this.x},${this.y}]</a>`;
  }
  return `[${this.roomName} ${this.x},${this.y}]`;
};

Creep.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${this.name ? this.name : this.id}]</a>`;
  }
  return `[${this.name ? this.name : this.id}]`;
};

Structure.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${this.structureType ? this.structureType : this.id}]</a>`;
  }
  return `[(${this.structureType}) #${this.id}]`;
};

StructureSpawn.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${this.name ? this.name : this.id}]</a>`;
  }
  return `[(${this.structureType}) #${this.id}]`;
};

Room.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    return `<a href="#!/room/${Game.shard.name}/${this.name}">[${this.name}]</a>`;
  }
  return `[(${this.name}) #${this.name}]`;
};
