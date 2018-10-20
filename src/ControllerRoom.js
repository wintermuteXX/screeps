var ControllerSpawn = require("ControllerSpawn");
var ControllerCreep = require("ControllerCreep");
var ControllerLink = require("ControllerLink");
var ControllerTower = require("ControllerTower");
var ControllerTerminal = require("ControllerTerminal");

function ControllerRoom(room, ControllerGame) {
	this.room = room;
	this._find = {};
	this._spawns = [];
	this._towers = [];

	//if (this.room.energyCapacityAvailable === this.room.energyAvailable) {
		var spawns = this.find(FIND_MY_SPAWNS);
		for (var s in spawns) {
			var spawn = spawns[s];
			this._spawns.push(new ControllerSpawn(spawn, this));
		}
	//}

	this.links = new ControllerLink(this);

	var towers = this.getTowers();

	for (var t in towers) {
		var tower = towers[t];
		this._towers.push(new ControllerTower(tower, this));
	}

	this.terminal = new ControllerTerminal(this);
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
		if (Game.time % global.getFixedValue('repairTower') === 0) {
			tower.repair();
		}
	})

	this.findResources();
	this.needResources();

	if (Game.time % global.getFixedValue('internalTrade') === 0 && Game.cpu.tickLimit > 50) {
		this.terminal.internalTrade();
	}

	if (Game.time % global.getFixedValue('sellOverflow') === 0 && Game.cpu.tickLimit > 50) {
		this.terminal.sellOverflow();
	}

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
 * ControllerRoom.populate()
 */
ControllerRoom.prototype.populate = function () {
	if (Game.time % global.getFixedValue('checkPopulation') !== 0) return;

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
				if (spawn.createCreep(role, cfg)) {
					return;
				}
				spawn = null;
			}
		}
	}
};

ControllerRoom.prototype.needResources = function () {
	if (Game.time % global.getFixedValue('checkResourcesQueue') !== 0) return;
	var memory = this.room.memory;
	var needResources = {};

	let ext = this.getExtensionsNotFull();
	for (var l of ext) {
		needResources[l.id + "|energy"] = {
			'resourceType': "energy",
			'amount': l.energyCapacity - l.energy,
			'id': l.id
		};
	}

	let spa = this.getSpawnsNotFull();
	for (var s of spa) {
		needResources[s.id + "|energy"] = {
			'resourceType': "energy",
			'amount': s.energyCapacity - s.energy,
			'id': s.id
		};
	}

	let con = this.getControllerNotFull();
	if (con && con != null) {
		needResources[con.id + "|energy"] = {
			'resourceType': "energy",
			'amount': con.storeCapacity - _.sum(con.store),
			'id': con.id
		};
	}

	let lab = this.getLabsNotFull();
	for (var l of lab) {
		needResources[l.id + "|energy"] = {
			'resourceType': "energy",
			'amount': l.energyCapacity - l.energy,
			'id': l.id
		};
	}

	let nuk = this.getNukerNotFull();
	for (var n of nuk) {
		needResources[n.id + "|energy"] = {
			'resourceType': "energy",
			'amount': n.energyCapacity - n.energy,
			'id': n.id
		};
	}

	let pow = this.getPowerSpawnNotFull();
	for (var p of pow) {
		needResources[p.id + "|energy"] = {
			'resourceType': "energy",
			'amount': p.energyCapacity - p.energy,
			'id': p.id
		};
	}

	let [sto] = this.getStorage();
	if (sto) {
		for (var r of RESOURCES_ALL) {
			if (sto.store[r] === undefined || sto.store[r] < 20000) {
				needResources[sto.id + "|" + r] = {
					'resourceType': r,
					'amount': 20000 - (sto.store[r] || 0),
					'id': sto.id
				};
			}
		}
	}

	memory.QueueNeededResources = needResources;
};

/**
 * 
 * Check for Resources available in the room. Writes in Memory.
 *
 */

ControllerRoom.prototype.findResources = function () {
	if (Game.time % global.getFixedValue('checkResourcesQueue') !== 0) return;
	var memory = this.room.memory;
	var droppedResources = {};

	// Dropped Resources
	for (var s of this.find(FIND_DROPPED_RESOURCES)) {
		if (s.amount > 100 && !s.pos.inRangeTo(this.room.controller.pos, 3)) {
			droppedResources[s.id + "|" + s.resourceType] = {
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
			if (amount > 200) {
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

	var ter = this.getTerminal();
	var sto = this.getStorage();

	// Terminal
	if (ter && sto) {
		_.each(ter, function (t) {
			_.each(t.store, function (amount, resourceType) {
				if ((sto[0].store[resourceType] === undefined || sto[0].store[resourceType] < 20000) || (resourceType == 'energy' && amount > 100000)) {
					droppedResources[t.id + "|" + resourceType] = {
						'resourceType': resourceType,
						'structure': true,
						'amount': amount,
						'id': t.id
					};
				};
			});
		});
	};

	// Storage
	if (sto) {
		_.each(sto, function (s) {
			_.each(s.store, function (amount, resourceType) {
				if ((amount > 20000) || (resourceType == 'energy' && amount > 0)) {
					droppedResources[s.id + "|" + resourceType] = {
						'resourceType': resourceType,
						'structure': true,
						'amount': amount,
						'id': s.id
					};
				};
			});
		});
	};

	memory.QueueAvailableResources = droppedResources;
};

ControllerRoom.prototype.find = function (type) {
	if (!this._find[type]) {
		this._find[type] = this.room.find(type);
	}
	return this._find[type];
};

/**
 * ControllerRoom.getCreeps(role, target)
 * No Parameter = all Creeps
 * role = all Creeps with role
 * role + target = all Creeps with role + target
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

ControllerRoom.prototype.findNearLink = function (obj) {
	if (obj.memory.link) {
		return obj.memory.link;
	}
	var links = this.links.senders;
	var thelink = obj.pos.findInRange(links, 1);
	if (thelink) {
		obj.memory.link = thelink;
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

ControllerRoom.prototype.getLevel = function () {
	var controller = this.getController();
	if (controller !== null && controller.my) {
		return controller.level;
	}
	return 0;
};

ControllerRoom.prototype.getController = function () {
	return this.room.controller || null;
};

// Get Controller Energy Target
ControllerRoom.prototype.getControllerEnergyTarget = function () {
	var controller = this.getController();

	if (controller != null) {
		var area = null; //...;


		// container
		var container = null;

		if (container != null) {
			return container;
		}


		// pile of energy
		var energyPile = null;

		if (energyPile) {
			return energyPile;
		}

	}

	return controller;
}


ControllerRoom.prototype.getControllerNotFull = function () {
	if (!this._controllerNF) {
		this._controllerNF = null;

		let controllerz = this.getController();
		if (controllerz) {
			let containerId = controllerz.memory.container || null;

			if (containerId != null) {
				var container = Game.getObjectById(containerId);

				if (container != null) {
					if (container.store && container.store[RESOURCE_ENERGY] + 200 < container.storeCapacity) {
						this._controllerNF = container
					}
				}
			}
		}
	}
	return this._controllerNF;
};

ControllerRoom.prototype.getStorage = function () {
	if (!this._storage) {
		this._storage = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_STORAGE
		});
	}
	return this._storage;
};

ControllerRoom.prototype.getIdleSpawn = function () {
	for (var i in this._spawns) {
		var sc = this._spawns[i];
		if (sc.idle()) {
			return sc;
		}
	}
	return null;
};

ControllerRoom.prototype.getSpawns = function () {
	if (!this._spawns2) {
		this._spawns2 = this.find(FIND_MY_SPAWNS);
	}
	return this._spawns2;
};

ControllerRoom.prototype.getSpawnsNotFull = function () {
	if (!this._spawnsNF) {
		let spawnz = this.getSpawns();
		this._spawnsNF = _.filter(spawnz, function (e) {
			return e.energy < e.energyCapacity;
		});
	}
	return this._spawnsNF;
};

ControllerRoom.prototype.getMineralContainer = function () {
	var containers = this.getContainers();
	var mineral = this.find(FIND_MINERALS);
	containers = _.filter(containers, function (f) {
		return f.pos.inRangeTo(mineral[0], 2)
	});
	if (containers) {
		return containers[0];
	}
	return null;
};

ControllerRoom.prototype.getMineralAmount = function () {
	var minerals = this.find(FIND_MINERALS);
	return minerals[0].mineralAmount;
};

ControllerRoom.prototype.getMineralType = function () {
	var minerals = this.find(FIND_MINERALS);
	if (minerals.length) {
		return minerals[0].mineralType;
	}
	return null;
};

ControllerRoom.prototype.getContainers = function () {
	if (!this._containers) {
		this._containers = _.filter(this.find(FIND_STRUCTURES), {
			structureType: STRUCTURE_CONTAINER
		});
	}
	return this._containers;
};

ControllerRoom.prototype.getExtensions = function () {
	if (!this._extensions) {
		this._extensions = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_EXTENSION
		});
	}
	return this._extensions;
};

ControllerRoom.prototype.getExtensionsNotFull = function () {
	if (!this._extensionsNF) {
		let extensions = this.getExtensions();
		if (extensions) {
			this._extensionsNF = _.filter(extensions, function (e) {
				return e.energy < e.energyCapacity;
			});
		} else {
			return null;
		}
	}
	return this._extensionsNF;
};

ControllerRoom.prototype.getLabs = function () {
	if (!this._myLabs) {
		this._myLabs = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_LAB
		});
	}
	return this._myLabs;
};

ControllerRoom.prototype.getLabsNotFull = function () {
	if (!this._myLabsNF) {
		let labs = this.getLabs();
		this._myLabsNF = _.filter(labs, function (e) {
			return e.energy < e.energyCapacity;
		});
	}
	return this._myLabsNF;
};

ControllerRoom.prototype.getPowerSpawn = function () {
	if (!this._myPowerSpawn) {
		this._myPowerSpawn = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_POWER_SPAWN
		});
	}
	return this._myPowerSpawn;
};

ControllerRoom.prototype.getPowerSpawnNotFull = function () {
	if (!this._myPowerSpawnNF) {
		let powerSpawn = this.getPowerSpawn();
		this._myPowerSpawnNF = _.filter(powerSpawn, function (e) {
			return e.energy < e.energyCapacity;
		});
	}
	return this._myPowerSpawnNF;
};

ControllerRoom.prototype.getNuker = function () {
	if (!this._myNuker) {
		this._myNuker = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_NUKER
		});
	}
	return this._myNuker;
};

ControllerRoom.prototype.getNukerNotFull = function () {
	if (!this._myNukerNF) {
		let nuker = this.getNuker();
		this._myNukerNF = _.filter(nuker, function (e) {
			return e.energy < e.energyCapacity;
		});
	}
	return this._myNukerNF;
};

ControllerRoom.prototype.getTowers = function () {
	if (!this._myTowers) {
		this._myTowers = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_TOWER
		});
	}
	return this._myTowers;
};

ControllerRoom.prototype.getTowersNotFull = function () {
	if (!this._myTowersNF) {
		let towers = this.getTowers();
		this._myTowersNF = _.filter(towers, function (s) {
			if (s.structureType === STRUCTURE_TOWER) {
				return s.energy < (s.energyCapacity - 100);
			}
		});
	}
	return this._myTowersNF;
};

ControllerRoom.prototype.getTerminal = function () {
	if (!this._myTerminal) {
		this._myTerminal = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_TERMINAL
		});
	}
	return this._myTerminal;
};

ControllerRoom.prototype.getLinks = function () {
	if (!this._myLinks) {
		this._myLinks = _.filter(this.find(FIND_MY_STRUCTURES), function (s) {
			return (s.structureType === STRUCTURE_LINK);
		});

	}
	return this._myLinks;
};

ControllerRoom.prototype.getSources = function () {
	if (!this._sources) {
		this._sources = this.find(FIND_SOURCES);
	}
	return this._sources;
};

ControllerRoom.prototype.getSourcesNotEmpty = function () {
	if (!this._sourcesNE) {
		let sources = this.getSources();
		if (sources) {
			this._sourcesNE = _.filter(sources, function (s) {
				return s.energy > 0;
			});
		} else {
			return null;
		}
	}
	return this._sourcesNE;
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

ControllerRoom.prototype.getSourceToMine = function () {
	if (!this._sourceTM) {
		let sources = this.getSources();
		if (sources) {
			this._sourceTM = _.filter(sources, function (s) {
				return (defended || false) == s.defended;
			});
		} else {
			return null;
		}
	}
	return this._sourceTM;
};

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

Room.prototype.getBestOrder = function (minInStock = 1000) {
	var _this = this;
	var minAmount = 1000;
	let mtype = _this.find(FIND_MINERALS)[0].mineralType;

	var orders = Game.market.getAllOrders().filter(function (order) {
		return order.type === ORDER_BUY // Only check sell orders
			&&
			//order.resourceType !== RESOURCE_ENERGY // Don't sell energy
			order.resourceType === mtype // Only Room Mineral
			&&
			order.remainingAmount > minAmount
			// Only look at orders with 1000+ units
			&&
			_this.terminal.store[order.resourceType] >= minInStock
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
		return order.profit > 0.07;
	});
	// Get best order and deal
	if (orders.length === 0)
		console.log('Found no deal in buy orders.', _this.name);
	var bestOrder = _.max(orders, 'profit');
	console.log("Amount: " + bestOrder.amount + " Fee: " + bestOrder.fee + " Profit: " + bestOrder.profit);
	// console.log(this.deal(bestOrder));
	let result = Game.market.deal(bestOrder.id, bestOrder.amount, _this.name);
	return result;
};

ControllerRoom.prototype.analyse = function () {
	// TODO: Hard coded CPU Limit? No way
	if (Game.cpu.tickLimit <= 100) return;
	var memory = this.room.memory;

	try {
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