function ControllerTerminal(rc) {
    this.room = rc;
    this.terminal = this.room.getTerminal();
}

ControllerTerminal.prototype.internalTrade = function () {
    let MIN_AMOUNT = 20000;
    let [terminal] = this.terminal;
    let cancelOrders = false;

    if (terminal && terminal.cooldown === 0) {
        _.each(terminal.store, function (amount, resourceType) {
            if (cancelOrders || (amount < MIN_AMOUNT))
                return;
            // How much can Terminal give away?
            var availableAmount = amount - MIN_AMOUNT;

            let myRooms = _.filter(Game.rooms, r => {
                return r.terminal && r.terminal.my;
            });

            for (var r in myRooms) {
                var aroom = myRooms[r];
                // Only check other rooms
                // BUG internalTrade will send 20000 Resources from every terminal, even if there is enough already
                if (aroom.terminal && (cancelOrders || terminal.room.name == aroom.name)) {
                    continue;
                }
                var e = aroom.getResourceAmount(resourceType);
                // How much does room need to get MIN_AMOUNT
                var needed = MIN_AMOUNT - e;
                if (needed > 0) {
                    // How much will the terminal send?
                    var sendAmount = Math.min(availableAmount, needed);

                    var result = terminal.send(resourceType, sendAmount, aroom.name, 'internal');
                    if (result == 0) {
                        cancelOrders = true;
                        Log.success(`${terminal.room.name} transfers ${sendAmount} of ${resourceType} to ${aroom.name}`, "internalTrade")
                    }

                }
            }
        })
    }
};


ControllerTerminal.prototype.sellOverflow = function () {
    let minInStock = 20000;
    let [terminal] = this.terminal;

    if (terminal && terminal.cooldown === 0) {
        terminal.room.getBestOrder(minInStock);
    }
};

ControllerTerminal.prototype.buyEnergyOrder = function () {
    if (Game.market.credits < global.getFixedValue('minCreditThreshold')) {
        Log.warn(`There are less than ${minCreditThreshold} credits available. Skipping...`, "buyEnergyOrder");
        return false
    }
    var orders = Game.market.orders;
    console.log("Orders: " + orders);
};

module.exports = ControllerTerminal;