function ControllerTerminal(rc) {
    this.room = rc;
    this.terminal = this.room.getTerminal();
}

ControllerTerminal.prototype.internalTrade = function () {
    let [terminal] = this.terminal;

    if (this.notBusy) {
        // console.log(this.terminal, this.terminal[0].store);
        _.each(terminal.store, function (amount, resourceType) {
            if (amount < 20000) {
                return;
            }
            for (var r in Game.rooms) {
                var aroom = Game.rooms[r];
                if (terminal.room.name == aroom.name) {
                    continue;
                }
                var e = aroom.getResourceAmount(resourceType);
                // console.log("For: " + aroom.name + " there is: " + e + " " + resourceType);
                if (e < 20000) {
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