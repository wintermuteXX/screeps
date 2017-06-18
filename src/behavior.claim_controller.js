var Behavior = require("_behavior");

var b = new Behavior("claim_controller");

b.when = function(creep, rc) {
  console.log("Should I claim controller? " + creep.name);
  return ( creep.room.controller && !creep.room.controller.my);
};

b.completed = function(creep, rc) {
  return (creep.room.controller.my);
};

b.work = function(creep, rc) {
  
if (creep.pos.isNearTo(creep.room.controller)) {
            creep.claimController(creep.room.controller);
        }
        else {
           console.log("I move to controller. Name: " + creep.name);
 
            creep.moveToEx(creep.room.controller);
        }
};

module.exports = b;
