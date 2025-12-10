/**
 * Prototype Initialization
 * 
 * This file initializes all prototype extensions by requiring the individual modules.
 */

require("./prototype.global")(global);

// Load prototype extensions
require("./prototype.creep");
require("./prototype.structure");
require("./prototype.room");
require("./prototype.position");

/**
 * RoomObject Prototype Extensions
 */

RoomObject.prototype.say = function (what) {
  this.room.visual
    .line(this.pos.x, this.pos.y, this.pos.x + 1 - 0.2, this.pos.y - 1, {
      // Line from object to message bubble
      color: "#eeeeee",
      opacity: 0.9,
      width: 0.1,
    })
    .circle(this.pos, {
      // Small dot marker at the top of object
      fill: "#aaffaa",
      opacity: 0.9,
    })
    .text(what, this.pos.x + 1, this.pos.y - 1, {
      // Fake message, used to align background (to make black border)
      color: "black",
      opacity: 0.9,
      align: "left",
      font: "bold 0.6 Arial",
      backgroundColor: "black",
      backgroundPadding: 0.3,
    })
    .text(what, this.pos.x + 1, this.pos.y - 1, {
      // Real message
      color: "black",
      opacity: 0.9,
      align: "left",
      font: "bold 0.6 Arial",
      backgroundColor: "#eeeeee",
      backgroundPadding: 0.2,
    });
};

/**
 * toString() methods for various game objects
 */

Resource.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    const resourceType = this.resourceType || 'unknown';
    const amount = this.amount || 0;
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[${resourceType}:${amount}]</a>`;
  }
  return `[(Resource ${this.resourceType}) #${this.id}]`;
};

Tombstone.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    const creepName = this.creep ? this.creep.name : 'unknown';
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[Tombstone:${creepName}]</a>`;
  }
  return `[(Tombstone) #${this.id}]`;
};

Ruin.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    const structureType = this.structure ? this.structure.structureType : 'unknown';
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[Ruin:${structureType}]</a>`;
  }
  return `[(Ruin) #${this.id}]`;
};

Mineral.prototype.toString = function (htmlLink = true) {
  if (htmlLink) {
    var onClick = "";
    if (this.id)
      onClick +=
        `angular.element('body').injector().get('RoomViewPendingSelector').set('${this.id}');` +
        `angular.element($('body')).scope().$broadcast('roomObjectSelected', _.filter(angular.element(document.getElementsByClassName('room ng-scope')).scope().Room.objects, (o)=>o._id==='${this.id}')[0]);`;
    const mineralType = this.mineralType || 'unknown';
    const amount = this.mineralAmount || 0;
    return `<a href="#!/room/${Game.shard.name}/${this.room.name}" onClick="${onClick}">[Mineral:${mineralType}:${amount}]</a>`;
  }
  return `[(Mineral ${this.mineralType}) #${this.id}]`;
};
