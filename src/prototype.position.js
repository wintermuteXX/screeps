/**
 * RoomPosition Prototype Extensions
 */

RoomPosition.prototype.toString = function (htmlLink = true, id = undefined) {
  if (htmlLink) {
    let onClick = "";
    if (id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${id}')[0]);`;
    return `<a href="#!/room/${Game.shard.name}/${this.roomName}" onClick="${onClick}">[${this.roomName} ${this.x},${this.y}]</a>`;
  }
  return `[${this.roomName} ${this.x},${this.y}]`;
};

