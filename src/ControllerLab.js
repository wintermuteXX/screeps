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
            noStatusLabs.push(theLab);
        }
    }

    // You need at least 3 labs for a reaction
    if (noStatusLabs.length >= 3) {
        _.shuffle(noStatusLabs)
        let test = noStatusLabs.length %= 3
        Log.debug(`calculate status for ${noStatusLabs.length} labs which is modulo ${test}`, "ControllerLab");
        for (let i = 0; i < noStatusLabs.length; i++) {

            if (noStatusLabs[i].pos.inRangeTo(noStatusLabs[i + 1].pos, 2) && noStatusLabs[i].pos.inRangeTo(noStatusLabs[i + 2].pos, 2)) {
                Log.debug(`${noStatusLabs[i]} is in Range to ${noStatusLabs[i+1]} and ${noStatusLabs[i+2]}`, "ControllerLab");

            }
        }
    }
};

module.exports = ControllerLab;