// LONGTERM Sell + Buy at Market

function ControllerTerminal(rc) {
    this.room = rc;
    this.terminal = this.room.getTerminal();
}

// BUG internalTrade checks for >50000 Energy / Maybe fix with new logistic system...
// BUG min_amount should not be needed for source (terminal) -> more for source (room)
ControllerTerminal.prototype.internalTrade = function () {
    let MIN_AMOUNT = 0; // TEST if 0 is OK
    let [terminal] = this.terminal;
    if (!terminal) {
        return null;
    }
    let cancelOrders = false;

    if (terminal && terminal.cooldown === 0) {
        _.each(terminal.store, function (amount, resourceType) {
            if (cancelOrders || (amount < MIN_AMOUNT))
                return;
            // How much can Terminal give away?
            var availableAmount = amount - MIN_AMOUNT;
            if (availableAmount === 0) {
                return;
            }

            let myRooms = _.filter(Game.rooms, r => {
                return r.terminal && r.terminal.my;
            });

            for (var r in myRooms) {
                var aroom = myRooms[r];
                // Only check other rooms
                // TEST internalTrade will send 20000 Resources from every terminal, even if there is enough already
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
                    // TODO Use switch statement
                    if (result == 0) {
                        cancelOrders = true;
                        Log.success(`${terminal.room.name} transfers ${sendAmount} of ${global.resourceImg(resourceType)} to ${aroom.name}`, "internalTrade")
                    }

                }
            }
        })
    }
};

ControllerTerminal.prototype.sellOverflow = function () {
    let [terminal] = this.terminal;
    if (!terminal) {
        return null;
    }
    let theMineralType = terminal.room.mineral.mineralType
    let energyPrice = 0.005;
    let theProfit = 0.05

    if (terminal && terminal.cooldown === 0 && terminal.store[theMineralType] > 30000) {

        let bestOrder = this.findBestOrder(theMineralType, energyPrice, theProfit);
        if (bestOrder !== null) {
            let result = Game.market.deal(bestOrder.id, bestOrder.amount, terminal.room.name);
            if (result == OK) {
                Log.success(`${bestOrder.amount} of ${global.resourceImg(bestOrder.resourceType)} sold to market. 💲: ${bestOrder.amount * bestOrder.price} - EnergyCost: ${bestOrder.fee * energyPrice} `, "sellOverflow");
            } else {
                Log.info(`No deal because: ${result}`, "sellOverflow");

            }
        } else {
            Log.info(`No deals for ${global.resourceImg(theMineralType)} overflow found for room ${terminal.room.name}`, "sellOverflow");
        }
    }
};

ControllerTerminal.prototype.buyEnergyOrder = function () {
    let minCreditThreshold = global.getFixedValue('minCreditThreshold');
    let minEnergyThreshold = global.getFixedValue('minEnergyThreshold');
    let [ter] = this.terminal;
    if (!ter) {
        return null;
    }
    let energyInTerminal = ter.store[RESOURCE_ENERGY];
    let orderExists = false

    if (Game.market.credits < minCreditThreshold) {
        Log.warn(`There are less than ${minCreditThreshold} credits available. Skipping...`, "buyEnergyOrder");
        return false;
    }
    if (energyInTerminal < (minEnergyThreshold - 5000)) {
        Log.debug(`Less than ${minEnergyThreshold} energy in Terminal. We should check orders for room ${ter.room.name}`, "buyEnergyOrder");

        for (let id in Game.market.orders) {
            let order = Game.market.orders[id];
            if (order.type === "buy" && order.resourceType === "energy" && order.roomName == ter.room.name) {
                Log.debug(`Found an existing buy energy order for room ${order.roomName}`, "buyEnergyOrder");
                orderExists = true;
                if ((order.remainingAmount + energyInTerminal) < minEnergyThreshold) {
                    Log.debug(`Found an existing buy energy order for room ${order.roomName} with remainingAmount ${order.remainingAmount} so I try to extend order by ${minEnergyThreshold} - ${order.remainingAmount} - ${energyInTerminal}`, "buyEnergyOrder");

                    let result = Game.market.extendOrder(order.id, minEnergyThreshold - order.remainingAmount - energyInTerminal);
                    switch (result) {
                        case OK:
                            Log.success(`ExtendOrder in room ${ter.room.name} was successful`, "buyEnergyOrder");
                            break;

                        default:
                            Log.warn(`Result for extendOrder in room ${ter.room.name}: ${result}`, "buyEnergyOrder");
                    }
                    break;
                }
            }
        }
        if (orderExists === false) {
            let result2 = Game.market.createOrder(ORDER_BUY, RESOURCE_ENERGY, 0.015, minEnergyThreshold, ter.room.name);
            switch (result2) {
                case OK:
                    Log.success(`Created order in room ${ter.room.name} for ${minEnergyThreshold} energy was successful`, "buyEnergyOrder");
                    break;

                default:
                    Log.warn(`Result for createOrder in room ${ter.room.name}: ${result2}`, "buyEnergyOrder");
            }
        }
    }
};

ControllerTerminal.prototype.findBestOrder = function (theMineralType, energyPrice, theProfit) {
    let [terminal] = this.terminal;
    let orders = Game.market.getAllOrders().filter(function (order) {
        return order.type === ORDER_BUY &&
            order.resourceType === theMineralType
    });

    orders = orders.map(function (order) {
        let amount = order.remainingAmount;
        let profit = 0;
        if (order.roomName) {
            var fee = Game.market.calcTransactionCost(amount, terminal.room.name, order.roomName);
            profit = order.price + (fee * energyPrice / amount);

        }

        return _.merge(order, {
            fee: fee,
            profit: profit,
            amount: amount
        });
    });
    orders = orders.filter(function (order) {
        return order.profit > theProfit;
    });
    if (orders.length === 0)
        return null;
    let bestOrder = _.max(orders, 'profit');
    return bestOrder;
};

module.exports = ControllerTerminal;