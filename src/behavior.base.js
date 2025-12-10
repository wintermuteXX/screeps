/**
 * Base Behavior class for ES2017
 * All behaviors should extend this class
 */
class Behavior {
  constructor(name) {
    this.name = name;
  }

  /**
   * Determines if this behavior should be executed
   * @param {Creep} creep - The creep
   * @param {RoomController} rc - The room controller
   * @returns {boolean} True if behavior should execute
   */
  when(creep, rc) {
    return false;
  }

  /**
   * Determines if this behavior is completed
   * @param {Creep} creep - The creep
   * @param {RoomController} rc - The room controller
   * @returns {boolean} True if behavior is completed
   */
  completed(creep, rc) {
    return true;
  }

  /**
   * Executes the behavior
   * @param {Creep} creep - The creep
   * @param {RoomController} rc - The room controller
   */
  work(creep, rc) {
    // Override in subclasses
  }
}

module.exports = Behavior;
