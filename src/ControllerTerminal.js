function ControllerTerminal(rc) {
    this.room = rc;
    this.terminal = this.room.getTerminal();
}

ControllerTerminal.prototype.internalTrade = function () {
    if (!this.notBusy) {
        return null
    }
    _.each(this.store, function (amount, resourceType) {
            if (amount < 20000) {
                return;
            }
            for (var r in Game.rooms) {
                var aroom = Game.rooms[r];
                if (this.room = aroom.name) {
                    continue;
                }
                var e = aroom.getResourceAmount(resourceType);
                console.log("For: " + aroom.name + " there is: " + e + " " + resourceType);
                if (e > 20000) {
                    console.log("Deal:" + this.room.name, amount, resourceType + " To: " + aroom.name);
                }
            }
        })
};

Object.defineProperty(ControllerTerminal.prototype, "notBusy", {
    get: function () {
        return _.filter(this.terminal, function (terminal) {
            return terminal.cooldown === 0;
        });
    }
});


module.exports = ControllerTerminal;