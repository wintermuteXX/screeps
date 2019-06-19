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
    var minCreditThreshold = global.getFixedValue('minCreditThreshold');
    var minEnergyThreshold = global.getFixedValue('minEnergyThreshold');
    var ter = this.terminal[0];
    var energyInTerminal = ter.store[RESOURCE_ENERGY];

    if (Game.market.credits < minCreditThreshold) {
        Log.warn(`There are less than ${minCreditThreshold} credits available. Skipping...`, "buyEnergyOrder");
        return false
    }
    // TODO Create new order when no order is present
    if (energyInTerminal < minEnergyThreshold) {
        Log.debug(`Less than ${minEnergyThreshold} energy in Terminal. We should check orders for room ${ter.room.name}`, "buyEnergyOrder");

        for (let id in Game.market.orders) {
            var order = Game.market.orders[id]
            if (order.type === "buy" && order.resourceType === "energy" && order.roomName == ter.room.name && (order.remainingAmount + energyInTerminal) < minEnergyThreshold) {
                Log.debug(`Found an existing buy energy order for room ${order.roomName} with remainingAmount ${order.remainingAmount} so I try to extend order by ${minEnergyThreshold} - ${order.remainingAmount} - ${energyInTerminal}`, "buyEnergyOrder");
                
                var result = Game.market.extendOrder(order.id, minEnergyThreshold - order.remainingAmount - energyInTerminal);
                switch (result) {
                    case OK:
                        Log.success(`ExtendOrder in room ${ter.room.name} was successful`, "buyEnergyOrder");
                        break;

                    default:
                        Log.warn(`Result for extendOrder in room ${ter.room.name}: ${result}`, "buyEnergyOrder");
                }
            }
        }
    }
};

module.exports = ControllerTerminal;