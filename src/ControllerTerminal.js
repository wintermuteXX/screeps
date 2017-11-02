function ControllerTerminal(rc) {
    this.room = rc;
    this.terminal = this.room.getTerminal();
}

ControllerTerminal.prototype.internalTrade = function () {
    if (this.notBusy) {
        for (var r in Game.rooms) {
            var aroom = Game.rooms[r];
            var e = aroom.getResourceAmount("energy");
        console.log("For: " + aroom.name + " there is energy: " + e);
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