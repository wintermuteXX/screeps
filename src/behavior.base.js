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
   * @param {Creep} _creep - The creep
   * @param {RoomController} _rc - The room controller
   * @returns {boolean} True if behavior should execute
   */
  when(_creep, _rc) {
    return false;
  }

  /**
   * Determines if this behavior is completed
   * @param {Creep} _creep - The creep
   * @param {RoomController} _rc - The room controller
   * @returns {boolean} True if behavior is completed
   */
  completed(_creep, _rc) {
    return true;
  }

  /**
   * Executes the behavior
   * @param {Creep} _creep - The creep
   * @param {RoomController} _rc - The room controller
   */
  work(_creep, _rc) {
    // Override in subclasses
  }
}

module.exports = Behavior;
