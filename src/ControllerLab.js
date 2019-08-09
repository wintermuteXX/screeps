function ControllerLab(rc) {
    this.room = rc;
    this.labs = this.room.getLabs();
}

ControllerLab.prototype.findLabPartner = function () {
    // TODO implement Lab Code
    var noStatusLabs = []

    for (let i in this.labs) {
        let theLab = this.labs[i];
        if (theLab.memory.status == undefined || theLab.memory.status == null) {
            Log.debug(`${theLab} has no status. Calculate status...`, "ControllerLab");
            noStatusLabs.push(theLab);
        }
    }

    if (noStatusLabs.length > 0) {
        Log.debug(`${this.room.name} Calculate Status for ${noStatusLabs.length} labs`, "ControllerLab");

    }

};

module.exports = ControllerLab;