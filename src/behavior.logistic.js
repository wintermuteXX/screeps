const Behavior = require("./behavior.base");
const Log = require("./lib.log");

/**
 * Logistic behavior: move resources between structures (storage, extensions, spawns, towers).
 * Handles distribution of energy and other resources to structures that need them.
 */
class LogisticBehavior extends Behavior {
  constructor() {
    super("logistic");
  }

  when(creep, rc) {
    if (!creep.store) return false;
    // Active if creep has resources to deliver
    if (creep.store.getUsedCapacity() > 0) return true;
    // Active if creep is logistic role and could get work
    if (creep.memory.role === "logistic") return true;
    return false;
  }

  completed(creep, rc) {
    return creep.store.getUsedCapacity() === 0 && !creep.memory.logisticTarget;
  }

  work(creep, rc) {
    
  }
}
  
module.exports = new LogisticBehavior();
