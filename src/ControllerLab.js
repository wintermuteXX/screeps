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
            Log.debug(`${this.room.name} has a lab ${theLab} with no status`, "ControllerLab");
            noStatusLabs.push(noStatusLabs);
        }
    }

    if (noStatusLabs.length >= 3) {
        Log.debug(`${this.room.name} calculate status for ${noStatusLabs.length} labs`, "ControllerLab");

        for (let i = 1; i < 10; i++) {
            _.shuffle(noStatusLabs)
            Log.debug(`${this.room.name} calculates array ${noStatusLabs} labs`, "ControllerLab");

        }
    }

};

module.exports = ControllerLab;