function ControllerTerminal(terminal, ControllerRoom) {
    this.terminal = terminal;
    this.ControllerRoom = ControllerRoom;
}

ControllerTerminal.prototype.internalTrade = function () {
    console.log("I do internal trade");
};

module.exports = ControllerTerminal;