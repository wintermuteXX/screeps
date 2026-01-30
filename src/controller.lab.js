const CONSTANTS = require("./config.constants");
const Log = require("./lib.log");

// LabStatus: empty, fill, produce
class ControllerLab {
  constructor(rc) {
    this.room = rc;
    this.labs = rc.room.labs;
  }

  /**
   * Helper function to safely get mineral amount from a lab
   * @param {StructureLab} lab - The lab to check
   * @returns {number} The amount of mineral (0 if none or error)
   */
  _getMineralAmount(lab) {
    if (!lab || !lab.getFirstMineral) {
      return 0;
    }
    const mineral = lab.getFirstMineral();
    return mineral && mineral.amount ? mineral.amount : 0;
  }

  /**
   * Helper function to check if a lab is empty (no minerals)
   * @param {StructureLab} lab - The lab to check
   * @returns {boolean} True if lab is empty
   */
  _isLabEmpty(lab) {
    if (!lab || !lab.memory) {
      return false;
    }
    return lab.memory.status === "empty" && this._getMineralAmount(lab) === 0;
  }

  /**
   * Helper function to check if all three labs are empty
   * @param {any} labA - First lab
   * @param {any} labB - Second lab
   * @param {StructureLab} theLab - Third lab (result lab)
   * @returns {boolean} True if all labs are empty
   */
  _areAllLabsEmpty(labA, labB, theLab) {
    return this._isLabEmpty(labA) && this._isLabEmpty(labB) && this._isLabEmpty(theLab);
  }

  /**
   * Helper function to check if a lab is filled with its resource
   * @param {any} lab - The lab to check
   * @returns {boolean} True if lab is filled
   */
  _isLabFilled(lab) {
    if (!lab || !lab.memory || !lab.memory.status || !lab.memory.resource) {
      return false;
    }
    return lab.memory.status === "fill" && lab.store.getFreeCapacity(lab.memory.resource) === 0;
  }

  /**
   * Helper function to get and validate partner labs
   * @param {StructureLab} theLab - The result lab
   * @returns {{labA: StructureLab, labB: StructureLab} | null} Partner labs or null if invalid
   */
  _getPartnerLabs(theLab) {
    if (!theLab || !theLab.memory || !theLab.memory.partnerA || !theLab.memory.partnerB) {
      return null;
    }

    const labA = Game.getObjectById(theLab.memory.partnerA);
    const labB = Game.getObjectById(theLab.memory.partnerB);

    if (!labA || !labB) {
      Log.warn(`${theLab.room} Partner labs not found for ${theLab}, resetting memory`, "lab");
      this._resetLabMemory(labA, labB, theLab);
      return null;
    }

    return { labA, labB };
  }

  /**
   * Helper function to set lab status to empty
   * @param {StructureLab} labA - First lab
   * @param {StructureLab} labB - Second lab
   * @param {StructureLab} theLab - Result lab
   */
  _setLabsToEmpty(labA, labB, theLab) {
    if (labA && labA.memory) labA.memory.status = "empty";
    if (labB && labB.memory) labB.memory.status = "empty";
    if (theLab && theLab.memory) theLab.memory.status = "empty";
  }

  /**
   * Helper function to reset all lab memory (used when labs are out of range or error occurs)
   * @param {StructureLab} labA - First lab
   * @param {StructureLab} labB - Second lab
   * @param {StructureLab} theLab - Third lab (result lab)
   */
  _resetLabMemory(labA, labB, theLab) {
    if (labA && labA.memory) {
      delete labA.memory.status;
      delete labA.memory.resource;
      delete labA.memory.usedBy;
    }
    if (labB && labB.memory) {
      delete labB.memory.status;
      delete labB.memory.resource;
      delete labB.memory.usedBy;
    }
    if (theLab && theLab.memory) {
      delete theLab.memory.status;
      delete theLab.memory.resource;
      delete theLab.memory.partnerA;
      delete theLab.memory.partnerB;
    }
  }

  /**
   * Helper function to check if three labs are in range of each other
   * @param {StructureLab} lab1 - First lab
   * @param {StructureLab} lab2 - Second lab
   * @param {StructureLab} lab3 - Third lab
   * @returns {boolean} True if all labs are in range
   */
  _areLabsInRange(lab1, lab2, lab3) {
    if (!lab1 || !lab2 || !lab3) {
      return false;
    }
    if (!lab1.pos || !lab2.pos || !lab3.pos) {
      return false;
    }
    return lab1.pos.inRangeTo(lab2.pos, CONSTANTS.LAB.RANGE) &&
           lab1.pos.inRangeTo(lab3.pos, CONSTANTS.LAB.RANGE);
  }

  /**
   * Helper function to assign lab partners in memory
   * @param {StructureLab} labA - First lab (resource A)
   * @param {StructureLab} labB - Second lab (resource B)
   * @param {StructureLab} labResult - Third lab (result lab)
   */
  _assignLabPartners(labA, labB, labResult) {
    if (!labA || !labB || !labResult) {
      return;
    }

    if (!labA.memory) labA.memory = {};
    if (!labB.memory) labB.memory = {};
    if (!labResult.memory) labResult.memory = {};

    labA.memory.status = "empty";
    labB.memory.status = "empty";
    labResult.memory.status = "empty";
    labA.memory.usedBy = labResult.id;
    labB.memory.usedBy = labResult.id;
    labResult.memory.partnerA = labA.id;
    labResult.memory.partnerB = labB.id;
  }

  findLabPartner() {
    const noStatusLabs = [];

    // Find all labs without status
    for (const i in this.labs) {
      const theLab = this.labs[i];
      if (theLab && (!theLab.memory || theLab.memory.status === undefined || theLab.memory.status === null)) {
        noStatusLabs.push(theLab);
      }
    }

    // You need at least 3 labs without status to find a partner
    if (noStatusLabs.length < CONSTANTS.ROOM.SOURCE_COUNT_CORE) {
      return;
    }

    const shuffledLabs = _.shuffle(noStatusLabs);
    // Remove array items if array can not be divided by 3
    const trimmedLabs = shuffledLabs.slice(0, shuffledLabs.length - (shuffledLabs.length % 3));

    // Check if all lab groups are in range
    let allInRange = true;
    for (let i = 0; i < trimmedLabs.length; i += 3) {
      if (!this._areLabsInRange(trimmedLabs[i], trimmedLabs[i + 1], trimmedLabs[i + 2])) {
        allInRange = false;
        break;
      }
    }

    // Set status + labpartner in memory if all are in range
    if (allInRange) {
      Log.success("Finding labpartners was successfull", "findLabPartner");
      for (let j = 0; j < trimmedLabs.length; j += 3) {
        this._assignLabPartners(trimmedLabs[j], trimmedLabs[j + 1], trimmedLabs[j + 2]);
      }
    }
  }

  checkStatus() {
    for (const i in this.labs) {
      const theLab = this.labs[i];
      const partners = this._getPartnerLabs(theLab);
      if (!partners) {
        continue;
      }

      const { labA, labB } = partners;

      // Empty -> Fill
      if (this._areAllLabsEmpty(labA, labB, theLab)) {
        const reaction = this.room.getFirstPossibleLabReaction();
        if (reaction) {
          Log.success(`${theLab.room} will fill ${labA} with ${global.resourceImg(reaction["resourceA"])} and ${labB} with ${global.resourceImg(reaction["resourceB"])} to get ${global.resourceImg(reaction["result"])}`, "checkStatus");
          labA.memory.status = "fill";
          labA.memory.resource = reaction["resourceA"];
          labB.memory.status = "fill";
          labB.memory.resource = reaction["resourceB"];
          theLab.memory.status = "fill";
          theLab.memory.resource = reaction["result"];
        }
      }

      // Fill -> Produce
      if (this._isLabFilled(labA) && this._isLabFilled(labB)) {
        Log.success(`${theLab.room} will produce ${global.resourceImg(theLab.memory.resource)} in labs`, "checkStatus");
        labA.memory.status = "produce";
        labB.memory.status = "produce";
        theLab.memory.status = "produce";
      }
    }
  }

  produce() {
    for (const i in this.labs) {
      const theLab = this.labs[i];
      if (!theLab || !theLab.memory || theLab.memory.status !== "produce") {
        continue;
      }

      // Check if it's time to run the reaction
      if (!REACTION_TIME || !REACTION_TIME[theLab.memory.resource] || (Game.time % REACTION_TIME[theLab.memory.resource] !== 0)) {
        continue;
      }

      const partners = this._getPartnerLabs(theLab);
      if (!partners) {
        continue;
      }

      const { labA, labB } = partners;
      const result = theLab.runReaction(labA, labB);

      switch (result) {
        case OK:
          break;
        case ERR_FULL:
        case ERR_INVALID_ARGS:
        case ERR_NOT_ENOUGH_RESOURCES:
          Log.success(`${theLab.room} Resources exhausted. Set labs status to empty. ${theLab}`, "lab produce");
          this._setLabsToEmpty(labA, labB, theLab);
          break;
        case ERR_NOT_IN_RANGE:
          this._resetLabMemory(labA, labB, theLab);
          Log.warn(`${theLab.room} Problem with labs ${theLab}: reset all memory`, "lab produce");
          break;
        default:
          Log.warn(`${theLab.room} Unknown result from ${theLab}: ${global.getErrorString(result)}`, "lab produce");
      }
    }
  }
}

module.exports = ControllerLab;
