/**
 * Creep Prototype Extensions
 */

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

/**
 * Get harvest power per tick for this creep
 * @returns {number} Energy units this creep can harvest per tick
 *
 * Examples:
 * - 1 normal WORK part = 2 energy/tick (HARVEST_POWER)
 * - 1 WORK with UO boost (harvest: 3) = 6 energy/tick
 * - 1 WORK with XUHO2 boost (harvest: 7) = 14 energy/tick
 */
Creep.prototype.getHarvestPowerPerTick = function() {
  if (!this.body || !Array.isArray(this.body)) {
    return 0;
  }

  let totalHarvestPower = 0;

  for (const part of this.body) {
    // Only count WORK parts
    if (part.type !== WORK) {
      continue;
    }

    // Skip inactive/damaged parts (hits === 0 means part is destroyed)
    if (part.hits <= 0) {
      continue;
    }

    // Base harvest power for this WORK part
    if (!part.boost) {
      totalHarvestPower += HARVEST_POWER;
      continue;
    }

    // BOOSTS structure: BOOSTS.work[boostResourceType].harvest
    if (part.boost && BOOSTS.work && BOOSTS.work[part.boost] && BOOSTS.work[part.boost].harvest) {
      totalHarvestPower += BOOSTS.work[part.boost].harvest;
    }
  }

  return totalHarvestPower;
};

Creep.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    let onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${this.name ? this.name : this.id}]</a>`;
  }
  return `[${this.name ? this.name : this.id}]`;
};

