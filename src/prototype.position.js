/**
 * RoomPosition Prototype Extensions
 */

Object.defineProperty(RoomPosition.prototype, "freeFieldsCount", {
  get: function () {
    const terrain = Game.map.getRoomTerrain(this.roomName);
    let freeSpaceCount = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = this.x + dx;
        const y = this.y + dy;
        // Check bounds
        if (x < 0 || x > 49 || y < 0 || y > 49) continue;
        // TERRAIN_MASK_WALL = 1
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          freeSpaceCount++;
        }
      }
    }
    return freeSpaceCount;
  },
  enumerable: false,
  configurable: true,
});

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

