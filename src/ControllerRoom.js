var ControllerSpawn = require("ControllerSpawn");
var ControllerCreep = require("ControllerCreep");
var ControllerLink = require("ControllerLink");
var ControllerTower = require("ControllerTower");

function ControllerRoom(room, ControllerGame) {
	this.room = room;
	this._find = {};
	this._spawns = [];
	this._towers = [];

	var spawns = this.find(FIND_MY_SPAWNS);
	for (var s in spawns) {
		var spawn = spawns[s];
		this._spawns.push(new ControllerSpawn(spawn, this));
	}

	this.links = new ControllerLink(this);

	var towers = room.find(FIND_MY_STRUCTURES, {
		filter: {
			structureType: STRUCTURE_TOWER
		}
	});

	for (var t in towers) {
		var tower = towers[t];
		this._towers.push(new ControllerTower(tower, this));
	}
}

/**
 * ControllerRoom.run()
 */
ControllerRoom.prototype.run = function () {
	this.analyse();

	this.populate();

	this.links.transferEnergy();

	this.commandCreeps();


	_.each(this._towers, function (tower) {
		tower.fire();
		if (Game.time % global.getInterval('repairTower') === 0) {
			tower.repair();
		}
	})

	this.findResources();
};

/**
 * ControllerRoom.populate()
 */
ControllerRoom.prototype.populate = function () {
	if (Game.time % global.getInterval('checkPopulation') !== 0) return;

	var spawn = null;

	var roles = global.getCreepRoles();
	var cfgCreeps = global.getCreepsConfig();

	for (var i in roles) {
		var role = roles[i];
		if (spawn === null) spawn = this.getIdleSpawn();
		if (spawn === null) return;

		var cfg = cfgCreeps[role];
		if (!cfg.produceGlobal || cfg.produceGlobal === false) {
			if (this._shouldCreateCreep(role, cfg)) {
				if (!spawn.createCreep(role, cfg)) {
					return;
				}
				spawn = null;
			}
		}
	}
};

/**
 * 
 * Check for Resources available in the room. Writes in Memory.
 *
 */

ControllerRoom.prototype.findResources = function () {
	if (Game.time % global.getInterval('checkResourcesQueue') !== 0) return;
	var memory = this.room.memory;
	var droppedResources = {};

	// Dropped Resources
	for (var s of this.find(FIND_DROPPED_RESOURCES)) {
		if (!s.pos.inRangeTo(this.room.controller.pos, 3)) {
			droppedResources[s.id + "| " + s.resourceType] = {
				'resourceType': s.resourceType,
				'structure': false,
				'amount': s.amount,
				'id': s.id
			};
		};
	}

	// Links
	for (var l of _.filter(this.links.receivers, function (l) {
			return l.energy > 0 && !l.pos.inRangeTo(l.room.controller.pos, 3);
		})) {
		droppedResources[l.id + "|energy"] = {
			'resourceType': "energy",
			'structure': true,
			'amount': l.energy,
			'id': l.id
		};
	}

	// Containers
	var containers = _.filter(this.find(FIND_STRUCTURES), function (d) {
		return d.structureType === STRUCTURE_CONTAINER && !d.pos.inRangeTo(d.room.controller.pos, 3);
	});

	_.each(containers, function (c) {
		_.each(c.store, function (amount, resourceType) {
			if (amount > 0) {
				// console.log(c.room.name + " In Container: " + resourceType + " " + amount);
				droppedResources[c.id + "|" + resourceType] = {
					'resourceType': resourceType,
					'structure': true,
					'amount': amount,
					'id': c.id
				};
			};
		});
	});

	memory.QueueAvailableResources = droppedResources;
};

/**
 * ControllerRoom._shouldCreateCreep(role, cfg) : boolean
 *
 * Check, if creep should be created
 */

ControllerRoom.prototype._shouldCreateCreep = function (role, cfg) {
	var level = this.getLevel();
	var lReq = cfg.levelMin || 1;
	var lMax = cfg.levelMax || 10;
	if (level < lReq) return false;
	if (lMax < level) return false;

	if (!cfg.canBuild) {
		console.log(role + " : no canBuild() implemented");
		return false;
	}

	return cfg.canBuild(this);
};

/**
 * ControllerRoom.commandCreeps()
 */
ControllerRoom.prototype.commandCreeps = function () {
	var cc = new ControllerCreep(this);
	var creeps = this.find(FIND_MY_CREEPS);

	for (var c in creeps) {
		cc.run(creeps[c]);
	}
};

/**
 * ControllerRoom.find(type)
 */
ControllerRoom.prototype.find = function (type) {
	if (!this._find[type]) {
		this._find[type] = this.room.find(type);
	}
	return this._find[type];
};

/**
 * ControllerRoom.getCreeps(role, target)
 */
ControllerRoom.prototype.getCreeps = function (role, target) {
	var creeps = this.find(FIND_MY_CREEPS);

	if (role || target) {
		var filter = {
			'memory': {}
		};

		if (role) {
			filter.memory.role = role;
		}

		if (target) {
			filter.memory.target = target;
		}

		creeps = _.filter(creeps, filter);
	}

	return creeps;
};

/**
 * ControllerRoom.getController()
 */
ControllerRoom.prototype.getController = function () {
	if (this.room.controller) {
		return this.room.controller;
	}
	return null;
};

ControllerRoom.prototype.findNearLink = function (obj) {
	var links = this.links.senders;
	var thelink = obj.pos.findInRange(links, 1);
	if (thelink) {
		return thelink;
	}
	return null;
};

ControllerRoom.prototype.getEnemys = function () {
	var allowedNameList = ["lur", "starwar15432", "leonyx", "lisp", "rubra", "thekraken", "apemanzilla", "iskillet"]
	var targetList = this.room.find(FIND_HOSTILE_CREEPS, {
		filter: function (foundCreep) {
			for (let i = allowedNameList.length; --i >= 0;) {
				if (foundCreep.owner.username === allowedNameList[i]) return (false);
			}
			return (true);
		}
	});
	return targetList;
};

/**
 * ControllerRoom.getLevel()
 */
ControllerRoom.prototype.getLevel = function () {
	var controller = this.getController();
	if (controller !== null && controller.my) {
		return controller.level;
	}
	return 0;
};

/**
 * ControllerRoom.getIdleSpawn()
 */
ControllerRoom.prototype.getIdleSpawn = function () {
	for (var i in this._spawns) {
		var sc = this._spawns[i];
		if (sc.idle()) {
			return sc;
		}
	}
	return null;
};

ControllerRoom.prototype.getMineralContainer = function () {
	var containers = _.filter(this.find(FIND_STRUCTURES), function (f) {
		return f.structureType === STRUCTURE_CONTAINER
	});
	var mineral = this.find(FIND_MINERALS);
	containers = _.filter(containers, function (f) {
		return f.pos.inRangeTo(mineral[0], 2)
	});
	if (containers) {
		return containers[0];
	} else return false
};

ControllerRoom.prototype.getMineralAmount = function () {
	var minerals = this.find(FIND_MINERALS);
	return minerals[0].mineralAmount;
};

ControllerRoom.prototype.getExtensions = function () {
	if (!this._extensions) {
		this._extensions = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_EXTENSION
		});
		return this._extensions;
	}
};

ControllerRoom.prototype.getSources = function () {
	if (!this._sources) {
		this._sources = this.find(FIND_SOURCES);
	}
	return this._sources;
};

ControllerRoom.prototype.getSourcesUndefended = function (defended) {
	if (!this._sourcesUD) {
		let sources = this.getSources();
		if (sources) {
			this._sourcesUD = _.filter(sources, function (s) {
				return (defended || false) == s.defended;
			});
		} else {
			return null;
		}
	}
	return this._sourcesUD;
};

Room.prototype.createCreep2 = function (role) {
	let spawns = _.filter(this.find(FIND_MY_SPAWNS), function (s) {
		return s.spawning === null
	});
	if (role === 'upgrader') {
		console.log("upgrader");
		var body = [MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK];
	}
	var j = body.length;
	for (var i = 0; i < j - 2; i++) {
		var result = spawns[0].canCreateCreep(body);
		if (result === 0) {
			console.log(this.name + " Build creep: " + role);
			spawns[0].createCreep(body, undefined, role);
			return true;
		} else {
			body.pop();
		}
	}
	return false;
};

Room.prototype.centerPoint = function () {

	const freeRange = 3;
	var bestPos;

	for (let x = 3; x < 46; x++) {
		for (let y = 3; y < 46; y++) {
			let pos = new RoomPosition(x, y, this.name);

			let exits = pos.findInRange(FIND_EXIT, freeRange);
			if (exits.length > 0) continue;

			let structs = pos.findInRange(FIND_STRUCTURES, freeRange, {
				filter: (s) => s.structureType != STRUCTURE_ROAD
			});
			if (structs.length > 0) continue;

			let flags = pos.findInRange(FIND_FLAGS, 4);
			if (flags.length > 0) continue;

			let terrain = _.filter(this.lookForAtArea(LOOK_TERRAIN, y - freeRange, x - freeRange, y + freeRange, x + freeRange, true), (p) => p.type == 'terrain' && p.terrain == 'wall');
			if (terrain.length > 0) continue;

			let goodPos = new RoomPosition(x, y, this.name);

			let toSource = [];
			let toController;

			_.forEach(this.find(FIND_SOURCES), (s) => {
				toSource.push(this.findPath(goodPos, s.pos, {
					ignoreCreeps: true,
					ignoreRoads: true,
					maxRooms: 1
				}).length);
			});

			toController = this.findPath(goodPos, this.controller.pos, {
				ignoreCreeps: true,
				ignoreRoads: true,
				maxRooms: 1
			}).length;

			let cnt = 0;

			if (!bestPos) {
				bestPos = {
					x: goodPos.x,
					y: goodPos.y,
					c: toController,
					s: toSource
				}
			}

			for (let foo in toSource) {
				if (bestPos.s[foo] > toSource[foo]) cnt++;
			}

			if (cnt >= 2 || (cnt >= 1 && toController <= bestPos.c) || toController * 2 <= bestPos.c) {
				bestPos = {

					x: goodPos.x,
					y: goodPos.y,
					c: toController,
					s: toSource
				}
			}
		}
	}

	this.createFlag(bestPos.x, bestPos.y, 'distrSquare:' + this.name, COLOR_PURPLE, COLOR_BLUE);
};

// total buggy. don't use
Room.prototype.getBestOrder = function () {
	var _this = this;
	var minAmount = 1000;
	var orders = Game.market.getAllOrders().filter(function (order) {
		return order.type === ORDER_BUY // Only check sell orders
			&&
			order.resourceType !== RESOURCE_ENERGY // Don't sell energy
			&&
			order.remainingAmount > minAmount
			// Only look at orders with 1000+ units
			&&
			_this.terminal.store[order.resourceType] >= 1000
	}); // terminal must have at least 1k of this resource
	// Compute, map and filter on profit
	// console.log("Step1: " + orders);
	var energyPrice = 0.01;
	orders = orders.map(function (order) {
		// console.log(order.remainingAmount, order.resourceType, _this.terminal.store[order.resourceType]);
		var amount = Math.min(order.remainingAmount, _this.terminal.store[order.resourceType]);
		// console.log(_this.name , order.roomName);
		var profit = 0;
		if (_this.name && order.roomName) {
			var fee = Game.market.calcTransactionCost(amount, _this.name, order.roomName);
			profit = order.price + (fee * energyPrice / amount);
			// console.log("Amount: " + amount + " Fee: " + fee + " Price: " + order.price  + " Profit: " + profit);
		}

		return _.merge(order, {
			fee: fee,
			profit: profit,
			amount: amount
		});
	});
	// console.log("Step2: " + orders);
	// orders = orders.filter(function (order) { return order.profit > cfg.get("market.minProfit." + order.resourceType); });
	orders = orders.filter(function (order) {
		return order.profit > 0.1;
	});
	// Get best order and deal
	if (orders.length === 0)
		console.log('Found no deal in buy orders.', _this.name);
	var bestOrder = _.min(orders, 'profit');
	// console.log(bestOrder);
	// console.log(this.deal(bestOrder));
	return Game.market.deal(bestOrder.id, bestOrder.amount, _this.name);
};

ControllerRoom.prototype.analyse = function () {
	// TODO: Hard coded CPU Limit? No way
	if (Game.cpu.tickLimit <= 100) return;
	var memory = this.room.memory;

	try {
		var sources = {};
		for (var source of this.find(FIND_SOURCES)) {
			sources[source.id] = {
				'defended': source.defended
			};
			//source.sourceContainer();
			//console.log("mem def: " + source.memory.defended + " source def: " + source.defended);
			//source.memory.defended = source.defended;
		}
		memory._sources = sources;

		// TODO: I think this isn't used anywhere
		/* var structures = {};
		for (var s of this.find(FIND_STRUCTURES)) {
			structures[s.id] = {
				'structureType': s.structureType,
				'hits': s.hits,
				'hitsMax': s.hitsMax
			};
		}
		memory._structures = structures; */
		memory.lastCheck = Game.time;

		if (!memory.roomType) {

			// source keeper
			let lairs = this.room.find(STRUCTURE_KEEPER_LAIR);
			if (lairs.length > 0) {
				memory.roomType = "ROOMTYPE_SOURCEKEEPER";
			}

			// core
			if (!memory.roomType) {
				let sources = this.room.find(FIND_SOURCES);
				if (sources.length === 3) {
					memory.roomType = "ROOMTYPE_CORE";
				}
			}

			// controller rooms
			if (!memory.roomType) {
				if (this.room.controller) {
					memory.roomType = "ROOMTYPE_CONTROLLER";
				} else {
					memory.roomType = "ROOMTYPE_ALLEY";
				}
			}
		}

	} catch (e) {
		console.log(e);
	}

};

module.exports = ControllerRoom;