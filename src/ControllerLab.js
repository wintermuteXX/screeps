function ControllerLab(rc) {
    this.room = rc;
    this.labs = rc.room.labs;
}
// TODO implement Lab Code
// LabStatus: empty, fill, produce

ControllerLab.prototype.findLabPartner = function () {

    var noStatusLabs = []

    for (let i in this.labs) {
        let theLab = this.labs[i];
        if (theLab.memory.status == undefined || theLab.memory.status == null) {
            noStatusLabs.push(theLab);
        }
    }

    // You need at least 3 labs without status to find a partner
    if (noStatusLabs.length >= 3) {
        noStatusLabs = _.shuffle(noStatusLabs)
        // Remove array items if array can not be divided by 3
        noStatusLabs.length = noStatusLabs.length - (noStatusLabs.length % 3)
        var error = 0;
        Log.debug(`calculate status for ${noStatusLabs.length} labs`, "ControllerLab");
        for (let i = 0; i < noStatusLabs.length; i += 3) {

            if (noStatusLabs[i].pos.inRangeTo(noStatusLabs[i + 1].pos, 2) && noStatusLabs[i].pos.inRangeTo(noStatusLabs[i + 2].pos, 2)) {
                Log.debug(`${noStatusLabs[i]} is in Range to ${noStatusLabs[i+1]} and ${noStatusLabs[i+2]}`, "ControllerLab");

            } else {
                // No luck this round. All labs need a partner! 
                error = 1;
                break;
            }
        }

        // Set status + labpartner in memory
        if (error == 0) {
            Log.success(`Finding labpartners was successfull`, "ControllerLab");
            for (let j = 0; j < noStatusLabs.length; j += 3) {
                noStatusLabs[j].memory.status = "empty"
                noStatusLabs[j + 1].memory.status = "empty"
                noStatusLabs[j + 2].memory.status = "empty"
                noStatusLabs[j].memory.usedBy = noStatusLabs[j + 2].id
                noStatusLabs[j + 1].memory.usedBy = noStatusLabs[j + 2].id
                noStatusLabs[j + 2].memory.partnerA = noStatusLabs[j].id
                noStatusLabs[j + 2].memory.partnerB = noStatusLabs[j + 1].id
            }
        }
    }
};

ControllerLab.prototype.checkStatus = function () {
    for (let i in this.labs) {
        let theLab = this.labs[i];
        if (theLab.memory.partnerA && theLab.memory.partnerB) {
            let labA = Game.getObjectById(theLab.memory.partnerA);
            let labB = Game.getObjectById(theLab.memory.partnerB);
            // Empty -> Fill
            if (labA && labA.memory && labA.memory.status == "empty" && labA.store.getUsedCapacity(labA.memory.resource) == 0 &&
                labB && labB.memory && labB.memory.status == "empty" && labB.store.getUsedCapacity(labB.memory.resource) == 0 &&
                theLab && theLab.memory && theLab.memory.status == "empty" && theLab.store.getUsedCapacity(theLab.memory.resource) == 0) {
                let reaction = this.room.getPossibleLabReaction();
                if (reaction) {
                    //    console.log("Reaction: " + reaction["resourceA"] + " " + reaction["resourceB"] + " " + reaction["result"]);
                    Log.success(`Room ${labA.room.name} will produce ${reaction["result"]} in labs`, "checkStatus");
                    labA.memory.status = "fill";
                    labA.memory.resource = reaction["resourceA"];
                    labB.memory.status = "fill";
                    labB.memory.resource = reaction["resourceB"];
                    theLab.memory.status = "fill";
                    theLab.memory.resource = reaction["result"];

                }
            }
            // Fill -> Produce
            if (labA && labA.memory && labA.memory.status == "fill" && labA.store.getFreeCapacity(labA.memory.resource) == 0 &&
                labB && labB.memory && labB.memory.status == "fill" && labB.store.getFreeCapacity(labB.memory.resource) == 0) {
                labA.memory.status = "produce";
                labB.memory.status = "produce";
                theLab.memory.status = "produce";
            }
            // Produce -> Empty
            if ((labA && labA.memory && labA.memory.status == "produce" && labA.store.getUsedCapacity(labA.memory.resource) == 0) ||
                (labB && labB.memory && labB.memory.status == "produce" && labB.store.getUsedCapacity(labB.memory.resource) == 0) ||
                (theLab && theLab.memory && theLab.memory.status == "produce" && theLab.store.getFreeCapacity(labB.memory.resource) == 0)) {
                labA.memory.status = "empty";
                labB.memory.status = "empty";
                theLab.memory.status = "empty";
            }

        }
    }
}

ControllerLab.prototype.produce = function () {

}

module.exports = ControllerLab;