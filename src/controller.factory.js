const Log = require("./lib.log");
const CONSTANTS = require("./config.constants");
const ResourceManager = require("./service.resource");

class ControllerFactory {
  constructor(rc) {
    this.room = rc;
    this.factory = rc.room.factory;
  }

  getFactoryLevel() {
    if (this.factory && this.factory.level) {
      return this.factory.level;
    } else {
      return null;
    }
  }

  /**
   * Automatically assigns a factory level if not already assigned.
   * Each level (1-5) can only exist once across all factories.
   * Once assigned, the level cannot be changed.
   */
  assignLevel() {
    if (!this.factory || !this.factory.my) {
      return false;
    }

    // Initialize factory levels memory if it doesn't exist
    if (!Memory.factoryLevels) {
      Memory.factoryLevels = {};
    }

    // Check if this factory already has a level assigned in memory
    const assignedLevel = Memory.factoryLevels[this.factory.id];
    if (assignedLevel !== undefined) {
      // Level already assigned - verify it matches the actual factory level
      if (this.factory.level !== assignedLevel) {
        // Factory level doesn't match memory - try to set it again
        return this.setFactoryLevel(assignedLevel);
      }
      return true; // Level already assigned and matches
    }

    // Find the next available level (1-5)
    const usedLevels = new Set();
    for (const factoryId in Memory.factoryLevels) {
      usedLevels.add(Memory.factoryLevels[factoryId]);
    }
    let nextLevel = null;
    for (let level = 1; level <= 5; level++) {
      if (!usedLevels.has(level)) {
        nextLevel = level;
        break;
      }
    }

    if (nextLevel === null) {
      Log.warn(`${this.factory.room.name} All factory levels (1-5) are already assigned. Cannot assign level to factory ${this.factory.id}`, "FactoryLevel");
      return false;
    }

    // Assign the level to this factory in memory
    Memory.factoryLevels[this.factory.id] = nextLevel;
    Log.success(`${this.factory.room.name} Assigned factory level ${nextLevel} to factory ${this.factory.id}`, "FactoryLevel");

    // Set the factory level using Power Creep
    return this.setFactoryLevel(nextLevel);
  }

  /**
   * Sets the factory level using a Power Creep with OPERATE_FACTORY power.
   */
  setFactoryLevel(level) {
    if (!this.factory || !this.factory.my) {
      return false;
    }

    // Check if factory already has the correct level
    if (this.factory.level === level) {
      return true;
    }

    // Find a Power Creep with OPERATE_FACTORY power in this room
    const powerCreeps = [];
    for (const pcName in Game.powerCreeps) {
      const pc = Game.powerCreeps[pcName];
      // Power Creep must be spawned and in the same room
      if (!pc.room || pc.room.name !== this.factory.room.name) {
        continue;
      }
      // Check if Power Creep has OPERATE_FACTORY power
      if (pc.powers && pc.powers[PWR_OPERATE_FACTORY] && pc.powers[PWR_OPERATE_FACTORY].level > 0) {
        powerCreeps.push(pc);
      }
    }

    if (powerCreeps.length === 0) {
      // No Power Creep available - log and wait
      if (Game.time % CONSTANTS.TICKS.FACTORY_POWER_CHECK === 0) {
        Log.warn(`${this.factory.room.name} No Power Creep with OPERATE_FACTORY power found. Factory ${this.factory.id} needs level ${level}`, "FactoryLevel");
      }
      return false;
    }

    // Use the first available Power Creep
    const powerCreep = powerCreeps[0];

    // Move Power Creep to factory if not in range
    if (powerCreep.pos.getRangeTo(this.factory) > 1) {
      powerCreep.moveTo(this.factory, { visualizePathStyle: { stroke: "#ffaa00" } });
      return false;
    }

    // Use OPERATE_FACTORY power to set the level
    const result = powerCreep.usePower(PWR_OPERATE_FACTORY, this.factory);
    
    switch (result) {
      case OK:
        Log.success(`${this.factory.room.name} Power Creep ${powerCreep.name} set factory ${this.factory.id} to level ${level}`, "FactoryLevel");
        return true;
      case ERR_TIRED:
        // Power Creep is tired, will try again next tick
        return false;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${this.factory.room.name} Power Creep ${powerCreep.name} doesn't have enough resources to use OPERATE_FACTORY`, "FactoryLevel");
        return false;
      default:
        Log.warn(`${this.factory.room.name} Failed to set factory level: ${global.getErrorString(result)}`, "FactoryLevel");
        return false;
    }
  }

  produceInFactory(ResourcesArray, check) {
    if (check === undefined) {
      check = true;
    }
    
    // Check if factory belongs to the player
    if (!this.factory || !this.factory.my) {
      return false;
    }
    
    let roomNeedsResource = true; // if no check is needed, this must be true

    for (const r of ResourcesArray) {
      let produce = true;
      if (check === true) {
        // Does this room really needs this resource? true || false
        roomNeedsResource = this.factory.room.getResourceAmount(r, "all") < this.factory.room.getRoomThreshold(r, "all");
      }
      // Check if all resources that are needed to produce, exist in factory
      for (const i in COMMODITIES[r].components) {
        const currentAmount = ResourceManager.getResourceAmount(this.factory.room, i, "factory");
        if (currentAmount < COMMODITIES[r].components[i]) {
          produce = false;
        }
      }

      if (produce === true && roomNeedsResource === true) {
        const result = this.factory.produce(r);
        switch (result) {
          case OK:
            Log.success(`${this.factory.room} The ${this.factory} produced ${global.resourceImg(r)}`, "FactoryProduce");
            return true;
          default:
            Log.warn(`${this.factory.room} Unknown result from ${this.factory} produce ${global.resourceImg(r)}: ${global.getErrorString(result)}`, "FactoryProduce");
            return false;
        }
      }
    }
    return false;
  }

  produce() {
    if (!this.factory || !this.factory.my || (this.factory && this.factory.cooldown !== 0)) {
      return null;
    }
    
    let result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_0, false);
    if (result === false) {
      result = this.produceInFactory(MarketCal.COMPRESSED_RESOURCES, true);
    }
    if (result === false && this.factory.level === 1) {
      result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_1, true);
    }
    if (result === false && this.factory.level === 2) {
      result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_2, true);
    }
    if (result === false && this.factory.level === 3) {
      result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_3, true);
    }
    if (result === false && this.factory.level === 4) {
      result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_4, true);
    }
    if (result === false && this.factory.level === 5) {
      result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_5, true);
    }
  }
}

module.exports = ControllerFactory;
