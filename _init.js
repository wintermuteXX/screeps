/**
 * Extend Creep
 */

 Object.defineProperty(Creep.prototype, "behavior", {
    get : function() {
      return this.memory['behavior'] || null;
    },
    set : function(newBehavior) {
      if ( newBehavior != null ) {
          this.memory['behavior'] = newBehavior
      } else {
        delete this.memory['behavior'];
      }
    }
 });

 Object.defineProperty(Creep.prototype, "role", {
   get : function() {
     return this.memory['role'] || null;
   },
   set : function(newRole) {
     if ( newRole != null ) {
         this.memory['role'] = newRole
     } else {
       delete this.memory['role'];
     }
   }
 });


var _moveOptions = {
  // TODO: insert move options  
};
Creep.prototype.move = function(target) {
  if ( this.fatigue == 0 ) {
    this.moveTo(target, _moveOptions);
  }
}
