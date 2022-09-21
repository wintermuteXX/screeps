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

ControllerFactory.prototype.produce = function () {
  if (!this.factory || (this.factory && this.factory.cooldown !== 0)) {
    return null;
  }
  // if (this.getFactoryLevel() == null) {
  if (true) {
    // Produce level 0
    let produce = true;
    let abort = false;
    const combinedResources = MarketCal.COMPRESSED_RESOURCES.concat(MarketCal.COMMODITIES_LEVEL_0);
    for (var r of combinedResources) {
      produce = true;
      if (abort == false && (this.factory.store[r] === undefined || this.factory.room.getResourceAmount(r, "all") < global.getRoomThreshold(r, "all"))) {
        // console.log("Factory " + this.factory.room.name + " produces: " + r + " RoomAmount " + this.factory.room.getResourceAmount(r, "all") + " Needed: " + global.getRoomThreshold(r, "all"));
        for (var i in COMMODITIES[r].components) {
          if ((this.factory.store[i] || 0) < COMMODITIES[r].components[i]) {
            // console.log("False: " + this.factory.store[i] + " " + this.factory.room);
            produce = false;
          }
        }
        if (produce === true) {
          let result = this.factory.produce(r);
          switch (result) {
            case OK:
              Log.success(`${this.factory.room} The ${this.factory} produced ${global.resourceImg(r)}`, "FactoryProduce");
              abort = true;
              break;
            default:
              Log.warn(`${this.factory.room} Unknown result from ${this.factory} produce ${global.resourceImg(r)}: ${result}`, "FactoryProduce");
              abort = true;
          }
        }
      }
    }
  }
};
module.exports = ControllerFactory;
