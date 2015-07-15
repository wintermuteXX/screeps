var BEHAVIORS = require("behaviors");

module.exports = {

  behaviors: BEHAVIORS,

  creeps: {

    "builder": {
      levelRequired: 1,
      levelMax: 2,
      body: [
        [MOVE, CARRY, WORK],
        [MOVE, MOVE, CARRY, CARRY, WORK]
      ],
      behaviors: [
        BEHAVIORS.HARVERST,
        BEHAVIORS.TRANSPORT_ENERGY,
        BEHAVIORS.STRUCTURES_BUILD,
        BEHAVIORS.STURCUTRES_REPAIR
      ]
    },

    "miner": {
      levelRequired: 3,
      body: [
        [],
        [],
        [MOVE, WORK, WORK]
      ],
      behaviors = [
        BEHAVIORS.HARVETS_MINER
      ]
    },

    "transporter": {
      levelRequired: 3,
      body: [
        [],
        [],
        [MOVE, MOVE, CARRY, CARRY]
      ],
      behaviors: [
        BEHAVIORS.FIND_ENERGY,
        BEHAVIORS.TRANSPORT_ENERGY
      ]
    }

    "upgrader": {

    },

    "constructor": {

    }

  }

}
