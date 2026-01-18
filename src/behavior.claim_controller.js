const Behavior = require("./behavior.base");
const Log = require("./lib.log");
const RoomPlanner = require("./service.planner");
const duneConfig = require("./config.dune");
const CONSTANTS = require("./config.constants");

class ClaimControllerBehavior extends Behavior {
  constructor() {
    super("claim_controller");
  }

  when(creep, rc) {
    // If target room is set and we are not there yet, travel there
    if (creep.memory.targetRoom && creep.memory.targetRoom !== creep.room.name) {
      return true; // We still need to travel to the target room
    }
    // If we are in the target room, check if we need to claim the controller
    // Or if we still need to place a spawn
    const needsClaiming = creep.room.controller && !creep.room.controller.my;
    const needsSpawnPlacing = this._shouldPlaceSpawn(creep, rc);
    return needsClaiming || needsSpawnPlacing;
  }

  completed(creep, rc) {
    // Done when controller is claimed and spawn is placed (or not needed)
    const controllerClaimed = creep.room.controller && creep.room.controller.my;
    const spawnPlaced = !this._shouldPlaceSpawn(creep, rc);
    return controllerClaimed && spawnPlaced;
  }

  work(creep, rc) {
    // If we are not in the target room yet, travel there
    if (creep.memory.targetRoom && creep.memory.targetRoom !== creep.room.name) {
      // Log once when traveling to the target room
      if (!creep.memory.travelingToTarget) {
        Log.success(`🏰 ${creep} traveling to target room ${creep.memory.targetRoom}`, "claim_controller");
        creep.memory.travelingToTarget = true;
      }

      const targetPos = new RoomPosition(
        CONSTANTS.ROOM.CENTER_POSITION_X,
        CONSTANTS.ROOM.CENTER_POSITION_Y,
        creep.memory.targetRoom
      );
      creep.travelTo(targetPos, {
        preferHighway: true,
        ensurePath: true,
        useFindRoute: true,
      });
      return;
    }

    // When we arrive in the target room, clear travel flag
    if (creep.memory.travelingToTarget) {
      Log.success(`🏰 ${creep} arrived at target room ${creep.room}`, "claim_controller");
      delete creep.memory.travelingToTarget;
    }

    // Priority 1: Claim controller first (must be done before placing spawn)
    if (creep.room.controller && !creep.room.controller.my) {
      if (creep.pos.isNearTo(creep.room.controller)) {
        const result = creep.claimController(creep.room.controller);
        if (result === OK) {
          Log.success(`🏰 ${creep} successfully claimed controller in ${creep.room}`, "claim_controller");
        } else {
          Log.error(`🏰 ${creep} failed to claim controller in ${creep.room}. Error: ${global.getErrorString(result)}`, "claim_controller");
        }
      } else {
        creep.travelTo(creep.room.controller);
      }
      return; // Wait until controller is claimed before placing spawn
    }

    // Priority 2: Place spawn after controller is claimed
    if (this._shouldPlaceSpawn(creep, rc)) {
      this._placeSpawn(creep, rc);
      return;
    }
  }

  /**
   * Check if spawn should be placed (white flag present and no spawns exist)
   * @param {Creep} creep - The creep
   * @param {ControllerRoom} rc - Room controller
   * @returns {boolean} True if spawn should be placed
   */
  _shouldPlaceSpawn(creep, rc) {
    const flag = creep.room.findFlagByColor(COLOR_WHITE);
    const {spawns} = rc.room; // Use room.spawns prototype
    return !!flag && flag.room === creep.room && (!spawns || spawns.length === 0);
  }

  /**
   * Place spawn construction site at optimal center position
   * Integrated from behavior.place_spawn
   * @param {Creep} creep - The creep
   * @param {ControllerRoom} rc - Room controller
   */
  _placeSpawn(creep, rc) {
    // Use RoomPlanner to find optimal center position
    const planner = new RoomPlanner(creep.room);
    const centerPos = planner._calculateOptimalCenter();

    if (!centerPos) {
      Log.error(`Could not find optimal center position in ${creep.room}`, "claim_controller");
      return;
    }

    const position = new RoomPosition(centerPos.x, centerPos.y, creep.room.name);
    const planetName = duneConfig.getRandomPlanet();
    const result = creep.room.createConstructionSite(position, STRUCTURE_SPAWN, planetName);

    if (result === ERR_RCL_NOT_ENOUGH) {
      // RCL not enough yet - claimer can suicide after placing spawn
      Log.warn(`Cannot place spawn in ${creep.room} - RCL not enough. Claimer will suicide.`, "claim_controller");
      creep.suicide();
      return;
    }
    
    if (result === OK) {
      Log.success(`🏗️ Build a new construction site for Spawn "${planetName}" in ${creep.room} at (${position.x}, ${position.y})`, "claim_controller");
    } else {
      Log.error(`Could not build Spawn in ${creep.room} at (${position.x}, ${position.y}). Error: ${global.getErrorString(result)}`, "claim_controller");
    }
  }
}

module.exports = new ClaimControllerBehavior();
