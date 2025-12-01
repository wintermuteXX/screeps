const ControllerRoom = require("ControllerRoom");
const CONSTANTS = require("./constants");
const Log = require("Log");

var ControllerGame = function () {
	// Garbage collection is now handled by memhack.js
	// This reduces duplicate work and improves performance

	this._rooms = {};
	for (var r in Game.rooms) {
		var room = Game.rooms[r];
		this._rooms[room.name] = new ControllerRoom(room, this);
	}
};

/**
 * Manages CPU bucket monitoring and tick skipping logic
 * @returns {boolean} Returns true if tick should be skipped, false otherwise
 */
ControllerGame.prototype.checkCpuBucket = function () {
	if (Game.cpu.bucket < CONSTANTS.CPU.BUCKET_CRITICAL) {
		// Only warn if bucket is decreasing (not after generatePixel)
		const prevBucket = Memory.previousBucket || 0;
		const bucketDecreasing = (Game.cpu.bucket < prevBucket) && (prevBucket !== 10000);
		
		if (Game.cpu.limit !== 0 && bucketDecreasing) {
			const bucketDiff = Game.cpu.bucket - prevBucket;
			const diffStr = bucketDiff >= 0 ? `+${bucketDiff}` : `${bucketDiff}`;
			Log.error(`Bucket critically low and decreasing. Skipping tick. Bucket: ${prevBucket} → ${Game.cpu.bucket} (${diffStr})`, "Main");
		}
		
		Memory.previousBucket = Game.cpu.bucket;
		return true; // Skip tick
	}

	if (Game.time % CONSTANTS.TICKS.LOG_INTERVAL === 0) {
		const prevBucket = Memory.previousBucket || Game.cpu.bucket;
		const bucketDiff = Game.cpu.bucket - prevBucket;
		const diffStr = bucketDiff >= 0 ? `+${bucketDiff}` : `${bucketDiff}`;
		Log.success(`------------------ Running //  Bucket: ${prevBucket} → ${Game.cpu.bucket} (${diffStr}) ------------------`, "Main");
	}

	return false; // Continue with tick
};

/**
 * Updates the previous bucket value in memory
 */
ControllerGame.prototype.updateBucketMemory = function () {
	Memory.previousBucket = Game.cpu.bucket;
};

ControllerGame.prototype.processRooms = function () {
	for (var i in this._rooms) {
		this._rooms[i].run();
	}
};

module.exports = ControllerGame;