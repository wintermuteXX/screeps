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
        _.shuffle(noStatusLabs)
        for (let i = 0; i < noStatusLabs.length; i++) {

            if (noStatusLabs[i].pos.inRangeTo(noStatusLabs[i + 1].pos, 2) && noStatusLabs[i].pos.inRangeTo(noStatusLabs[i + 2].pos, 2)) {
                Log.debug(`${noStatusLabs[i]} is in Range to ${noStatusLabs[i+2]} and ${noStatusLabs[i+2]}`, "ControllerLab");

            }
        }
    }
};

module.exports = ControllerLab;