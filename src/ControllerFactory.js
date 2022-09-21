const Log = require("./Log");

function ControllerFactory(rc) {
  this.room = rc;
  this.factory = rc.room.factory;
}

ControllerFactory.prototype.getFactoryLevel = function () {
  if (this.factory && this.factory.level) {
    return this.factory.level;
  } else {
    return null;
  }
};

ControllerFactory.prototype.produceInFactory = function (ResourcesArray, check = true) {
  /* if (ResourcesArray !== Array) {
    Log.error(`The Expected value must be an array`, "produceInFactory");
    return false;
  } */
  let roomNeedsResource = true; // if no check is needed, this must be true

  for (var r of ResourcesArray) {
    let produce = true;
    if (check === true) {
      // Does this room really needs this resource? true || false
      roomNeedsResource = this.factory.room.getResourceAmount(r, "all") < global.getRoomThreshold(r, "all");
    }
    // Check if all resources that are needed to produce, exist in factory
    for (var i in COMMODITIES[r].components) {
      if ((this.factory.store[i] || 0) < COMMODITIES[r].components[i]) {
        produce = false;
      }
    }

    if (produce === true && roomNeedsResource === true) {
      let result = this.factory.produce(r);
      switch (result) {
        case OK:
          Log.success(`${this.factory.room} The ${this.factory} produced ${global.resourceImg(r)}`, "FactoryProduce");
          return true;
        default:
          Log.warn(`${this.factory.room} Unknown result from ${this.factory} produce ${global.resourceImg(r)}: ${result}`, "FactoryProduce");
          return false;
      }
    }
  }
  return false;
};

ControllerFactory.prototype.produce = function () {
  if (!this.factory || (this.factory && this.factory.cooldown !== 0)) {
    return null;
  }
  //
  let result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_0, false);
  if (result === false) {
    result = this.produceInFactory(MarketCal.COMPRESSED_RESOURCES, true);
  }
  if (result === false && this.factory.level == 1) {
    result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_1, true);
  }
  if (result === false && this.factory.level == 2) {
    result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_2, true);
  }
  if (result === false && this.factory.level == 3) {
    result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_3, true);
  }
  if (result === false && this.factory.level == 4) {
    result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_4, true);
  }
  if (result === false && this.factory.level == 5) {
    result = this.produceInFactory(MarketCal.COMMODITIES_LEVEL_5, true);
  }
};
module.exports = ControllerFactory;
