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
            if ((this.factory.store[r] === undefined || this.factory.store[r] < global.barsInFactory) && this.factory.store[RESOURCE_ENERGY] >= 600) {
                let result = this.factory.produce(r)
                Log.success(`The factory ${this.factory} tried to produce ${r} with result ${result} `, "FactoryProduce")
                break;

            }
        }

    }
}
module.exports = ControllerFactory;