function ControllerTerminal(rc) {
    this.room = rc;
    this.terminal = this.room.getTerminal();
}

ControllerTerminal.prototype.internalTrade = function () {
    console.log("I do internal trade");
};

module.exports = ControllerTerminal;