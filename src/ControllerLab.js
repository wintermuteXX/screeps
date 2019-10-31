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
            // Log.debug(`has a lab ${theLab} with no status`, "ControllerLab");
            noStatusLabs.push(theLab);
        }
    }

    if (noStatusLabs.length >= 3) {
        Log.debug(`calculate status for ${noStatusLabs.length} labs`, "ControllerLab");

        for (let i = 1; i < 2; i++) {
            _.shuffle(noStatusLabs)
            Log.debug(`calculates array ${noStatusLabs} labs`, "ControllerLab");
            Log.debug(`${noStatusLabs[0].pos} is Position`, "ControllerLab");
            if (noStatusLabs[0].pos.inRangeTo(noStatusLabs[1].pos, 2)) {
                Log.debug(`${noStatusLabs[0]} is in Range to ${noStatusLabs[1]}`, "ControllerLab");

            }
        }
    }
};

module.exports = ControllerLab;