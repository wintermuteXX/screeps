module.exports = (function () {
	var DEFAULT_MIN_USED = 15;

	function Debugger(name, minUsed) {
		this.name = name;
		this.minUsed = minUsed || DEFAULT_MIN_USED;

		this.start = Game.getUsedCpu();
	}

	Debugger.prototype.end = function () {
		var used = Game.getUsedCpu() - this.start;
		if (used > this.minUsed) {
			console.log("Debugger", this.name, "Used CPU: " + used);
		}
	};

	return Debugger;
}());
