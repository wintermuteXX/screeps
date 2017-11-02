function ControllerTerminal(rc) {
    this.room = rc;
    this.terminal = this.room.getTerminal();
}

ControllerTerminal.prototype.internalTrade = function () {
    if (this.notBusy) {
        console.log("I'm not busy");
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