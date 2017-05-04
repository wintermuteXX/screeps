module.exports = (function () {
	var DEFAULT_MIN_USED = 20;

	function Debugger(name, minUsed) {
		this.name = name;
		this.minUsed = minUsed || DEFAULT_MIN_USED;

		this.start = game.cpu.getUsed();
	}

	Debugger.prototype.end = function () {
		var used = game.cpu.getUsed() - this.start;
		if (used > this.minUsed) {
			console.log("Debugger", this.name, "Used CPU: " + used);
		}
	};

	return Debugger;
}());
