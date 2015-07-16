function LinkController(rc) {
	this.roomController = rc;
}

Object.defineProperty(LinkController.prototype, "senders", {
	get: function () {
		return [];
	}
});

Object.defineProperty(LinkController.prototype, "receivers", {
	get: function () {
		return [];
	}
});

LinkController.prototype.transferEnergy = function () {
	var senders = this.senders;
	var receivers = this.receivers;

	for (var s in senders) {
		var sender = senders[s];

	}
};

module.exports = LinkController;
