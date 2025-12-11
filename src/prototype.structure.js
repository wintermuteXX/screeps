/**
 * Structure Prototype Extensions
 */

const Log = require("./lib.log");
const CONSTANTS = require("./config.constants");

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

/**
 * Source Prototype Extensions
 */

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

Object.defineProperty(Source.prototype, "canHarvestSource", {
  value: function(creep, rc) {
    // 1. Prüfe freie Plätze
    const freeSpaces = this.freeSpacesCount;
    const creepsTargeting = rc.getCreeps(null, this.id).length;
    const availableSpaces = freeSpaces - creepsTargeting;
    
    if (availableSpaces <= 0) {
      return { canHarvest: false, reason: 'no_free_spaces' };
    }
    
    // 2. Berechne aktuelle Harvest-Power (inkl. Boosts)
    let totalHarvestPower = 0;
    const harvestingCreeps = rc.getCreeps(null, this.id);
    for (const hCreep of harvestingCreeps) {
      if (hCreep.pos.isNearTo(this)) {
        totalHarvestPower += hCreep.getHarvestPowerPerTick();
      }
    }
    
    // 3. Berechne verfügbare Energy bei Ankunft
    const ticksToArrive = creep.pos.getRangeTo(this);
    const regenRate = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME;
    const currentEnergy = this.energy;
    const energyWhenArriving = Math.min(
      SOURCE_ENERGY_CAPACITY,
      currentEnergy + (regenRate * ticksToArrive) - (totalHarvestPower * ticksToArrive)
    );
    
    // 4. Prüfe ob genug Energy verfügbar sein wird
    const creepHarvestPower = creep.getHarvestPowerPerTick();
    const willHaveEnergy = energyWhenArriving > 0;
    
    return {
      canHarvest: availableSpaces > 0 && willHaveEnergy,
      availableSpaces: availableSpaces,
      currentHarvestPower: totalHarvestPower,
      energyWhenArriving: energyWhenArriving,
      creepHarvestPower: creepHarvestPower
    };
  },
  enumerable: false,
  configurable: true,
});

Source.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    const energy = this.energy || 0;
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[Source:${energy}]</a>`;
  }
  return `[(Source) #${this.id}]`;
};

