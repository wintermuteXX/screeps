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
}

ControllerFactory.prototype.produce = function () {
    if (!this.factory || (this.factory && this.factory.cooldown !== 0)) {
        return null
    }
    if (this.getFactoryLevel() == null) {
        // Produce level 0
        for (var r of MarketCal.COMPRESSED_RESOURCES) {
            if (this.factory.store[r] === undefined || this.factory.store[r] < global.getFillLevel(r, "factory")) {
                // console.log("Factory: " + this.factory.store[r] + " Needed: " + global.getFillLevel(r, "factory"))
                // TODO Check if the needed resources are available in factory+
                let produce = true
                for (var i in COMMODITIES[r].components) {
                    if (this.factory.store[i] < COMMODITIES[r].components[i]) {
                        produce = false;
                    }
                    // console.log(i + " " + COMMODITIES[r].components[i])
                }
                if (produce === true) {
                    let result = this.factory.produce(r)
                    Log.success(`The factory ${this.factory} produced ${r} with result ${result} `, "FactoryProduce")
                }
                break;

            }
        }
    }
}
module.exports = ControllerFactory;