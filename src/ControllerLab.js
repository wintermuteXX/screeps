function ControllerLab(rc) {
    this.room = rc;
    this.lab = this.room.getLabs();
}

ControllerLab.prototype.transferEnergy = function () {
    console.log("Labs: " + this.lab);
}