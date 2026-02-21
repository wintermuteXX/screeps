const Behavior = require("./behavior.base");
const Log = require("./lib.log");

/**
 * Power Creep behavior: travel to the room that needs this creep's OPERATE_FACTORY level
 * and set the factory level there. The Power Creep's power level (1-5) must match
 * the factory's assigned level in Memory.factoryLevels.
 */
class OperateFactoryBehavior extends Behavior {
  constructor() {
    super("operate_factory");
  }

  /**
   * Get the factory level this Power Creep can set (OPERATE_FACTORY power level 1-5).
   * @param {PowerCreep} pc
   * @returns {number|null}
   */
  static getMyLevel(pc) {
    if (!pc.powers || !pc.powers[PWR_OPERATE_FACTORY]) return null;
    const level = pc.powers[PWR_OPERATE_FACTORY].level;
    return level > 0 ? level : null;
  }

  /**
   * Find a factory that needs to be set to the given level (assigned in memory but not yet set).
   * @param {number} level - Factory level 1-5
   * @param {string} [preferFactoryId] - Preferred factory ID (e.g. from memory cache)
   * @param {string} [originRoomName] - If set, prefer factory in room closest to this room
   * @returns {StructureFactory|null}
   */
  static findFactoryNeedingLevel(level, preferFactoryId, originRoomName) {
    if (!Memory.factoryLevels || typeof level !== "number" || level < 1 || level > 5) return null;

    let best = null;
    let bestDist = Infinity;

    for (const factoryId in Memory.factoryLevels) {
      if (Memory.factoryLevels[factoryId] !== level) continue;
      const factory = Game.getObjectById(factoryId);
      if (!factory || !factory.my || factory.level === level) continue;

      if (preferFactoryId && factoryId === preferFactoryId) return factory;

      const dist = originRoomName && factory.room
        ? Game.map.getRoomLinearDistance(originRoomName, factory.room.name)
        : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = factory;
      }
    }
    return best;
  }

  when(pc, _rc) {
    if (!pc || !pc.room) return false; // not spawned
    const myLevel = OperateFactoryBehavior.getMyLevel(pc);
    if (myLevel == null) return false;
    const factory = OperateFactoryBehavior.findFactoryNeedingLevel(myLevel, pc.memory && pc.memory.targetFactoryId, pc.room && pc.room.name);
    return factory !== null;
  }

  completed(pc, _rc) {
    const myLevel = OperateFactoryBehavior.getMyLevel(pc);
    if (myLevel == null) return true;
    const factory = OperateFactoryBehavior.findFactoryNeedingLevel(myLevel, pc.memory && pc.memory.targetFactoryId, pc.room && pc.room.name);
    return factory === null;
  }

  work(pc, _rc) {
    const myLevel = OperateFactoryBehavior.getMyLevel(pc);
    if (myLevel == null) return;
    let factory = null;
    const cachedId = pc.memory && pc.memory.targetFactoryId;
    if (cachedId) {
      const obj = Game.getObjectById(cachedId);
      if (obj && obj.my && Memory.factoryLevels && Memory.factoryLevels[cachedId] === myLevel && obj.level !== myLevel) {
        factory = obj;
      }
    }
    if (!factory) {
      factory = OperateFactoryBehavior.findFactoryNeedingLevel(myLevel, null, pc.room && pc.room.name);
      if (factory && pc.memory) pc.memory.targetFactoryId = factory.id;
    }
    if (!factory) return;
    
    if (pc.pos.isNearTo(factory) > 1) {
      pc.travelTo(factory, { range: 1, visualizePathStyle: { stroke: "#ffaa00" } });
      return;
    }
    const result = pc.usePower(PWR_OPERATE_FACTORY, factory);
    switch (result) {
      case OK:
        Log.success(`${factory.room} Power Creep ${pc} set factory ${factory.id} to level ${myLevel}`, "FactoryLevel");
        if (pc.memory) pc.memory.targetFactoryId = null;
        break;
      case ERR_TIRED:
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        Log.warn(`${factory.room} Power Creep ${pc} doesn't have enough resources to use OPERATE_FACTORY`, "FactoryLevel");
        break;
      default:
        Log.warn(`${factory.room} Failed to set factory level: ${global.getErrorString ? global.getErrorString(result) : result}`, "FactoryLevel");
        if (pc.memory) pc.memory.targetFactoryId = null;
    }
  }
}

module.exports = new OperateFactoryBehavior();
