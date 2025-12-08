const ControllerRoom = require("ControllerRoom");
const CONSTANTS = require("./constants");
const Log = require("Log");
const cpuAnalyzer = require("CpuAnalyzer");

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
	// Get previous bucket from cpuHistory
	const prevBucket = cpuAnalyzer.getPreviousBucket();
	
	if (Game.cpu.bucket < CONSTANTS.CPU.BUCKET_CRITICAL) {
		// Only warn if bucket is decreasing (not after generatePixel)
		const bucketDecreasing = (Game.cpu.bucket < prevBucket) && (prevBucket !== 10000);
		
		if (Game.cpu.limit !== 0 && bucketDecreasing) {
			const bucketDiff = Game.cpu.bucket - prevBucket;
			const diffStr = bucketDiff >= 0 ? `+${bucketDiff}` : `${bucketDiff}`;
			Log.error(`Bucket critically low and decreasing. Skipping tick. Bucket: ${prevBucket} → ${Game.cpu.bucket} (${diffStr})`, "Main");
		}
		
		return true; // Skip tick
	}

	if (Game.time % CONSTANTS.TICKS.LOG_INTERVAL === 0) {
		const bucketDiff = Game.cpu.bucket - prevBucket;
		const diffStr = bucketDiff >= 0 ? `+${bucketDiff}` : `${bucketDiff}`;
		Log.success(`------------------ Running //  Bucket: ${prevBucket} → ${Game.cpu.bucket} (${diffStr}) ------------------`, "Main");
	}

	return false; // Continue with tick
};

/**
 * Updates the previous bucket value in memory
 * Note: This is now handled automatically by cpuAnalyzer.recordTick()
 * This method is kept for compatibility but does nothing.
 */
ControllerGame.prototype.updateBucketMemory = function () {
	// Bucket is now stored in Memory.cpuHistory via cpuAnalyzer.recordTick()
	// No need to update Memory.previousBucket anymore
};

ControllerGame.prototype.processRooms = function () {
	for (var i in this._rooms) {
		this._rooms[i].run();
	}
};

module.exports = ControllerGame;