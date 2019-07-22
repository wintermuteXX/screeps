function ControllerLab(rc) {
    this.room = rc;
    this.lab = this.room.getLabs();
}

ControllerLab.prototype.findLabPartner = function () {
    // TODO implement Lab Code
    for (let i in this.lab) {
        let theLab = this.lab[i];
        // console.log("Labs: " + theLab.id);
    }
}

module.exports = ControllerLab;