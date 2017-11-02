function ControllerTerminal(rc) {
    this.room = rc;
    this.terminal = this.room.getTerminal();
}

ControllerTerminal.prototype.internalTrade = function () {
    let MIN_AMOUNT = 20000;
    let [terminal] = this.terminal;
    let cancelOrders = false;

    if (this.notBusy) {
        // console.log(this.terminal, this.terminal[0].store);
        _.each(terminal.store, function (amount, resourceType) {
            if (cancelOrders || amount < MIN_AMOUNT)
                return;

            var availableAmount = amount - MIN_AMOUNT;

            for (var r in Game.rooms) {
                var aroom = Game.rooms[r];
                if (terminal.room.name == aroom.name) {
                    continue;
                }
                var e = aroom.getResourceAmount(resourceType);
                // console.log("For: " + aroom.name + " there is: " + e + " " + resourceType);
                var needed = MIN_AMOUNT - e;
                if (needed > 0) {

                    var sendAmount = Math.min(availableAmount, needed);

                    var result = terminal.send(resourceType, sendAmount, aroom.name, 'internal');
                    if (result.length) {
                        cancelOrders = true;
                    }
                    console.log("Deal:" + terminal.room.name, amount, resourceType + " To: " + aroom.name + e);

                }
            }
        })
    }
};

Object.defineProperty(ControllerTerminal.prototype, "notBusy", {
    get: function () {
        return _.filter(this.terminal, function (terminal) {
            return terminal.cooldown === 0;
        });
    }
});


module.exports = ControllerTerminal;