var ControllerSpawn = require("ControllerSpawn");
var ControllerCreep = require("ControllerCreep");
var ControllerLink = require("ControllerLink");
var ControllerTower = require("ControllerTower");
var ControllerTerminal = require("ControllerTerminal");
var ControllerLab = require("ControllerLab");

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

	var towers = this.room.towers;

	for (var t in towers) {
		var tower = towers[t];
		this._towers.push(new ControllerTower(tower, this));
	}

	this.terminal = new ControllerTerminal(this);
	this.labs = new ControllerLab(this);
}

ControllerRoom.prototype.run = function () {
	this.analyse();

	this.populate();

	this.links.transferEnergy();

	this.commandCreeps();

	_.each(this._towers, function (tower) {
		tower.fire();
		if (Game.time % global.getFixedValue('repairTower') === 0) {
			if (this.getLevel == 8 && (Math.random() >= 0.5)) {
				return
			}
			tower.repair();
		}
	})

	if (Game.time % global.getFixedValue('buyEnergyOrder') === 0) {
		this.terminal.buyEnergyOrder();
	}
	if (Game.time % global.getFixedValue('internalTrade') === 0) {
		this.terminal.internalTrade();
	}

	if (Game.time % global.getFixedValue('sellRoomMineralOverflow') === 0) {
		this.terminal.sellRoomMineralOverflow();
	}

	if (Game.time % global.getFixedValue('sellRoomMineral') === 0) {
		this.terminal.sellRoomMineral();
	}

	if (this.room.powerSpawn && this.room.powerSpawn.store.energy > 0 && this.room.powerSpawn.store.power > 0) {
		this.room.powerSpawn.processPower();
	}
	// this.labs.findLabPartner();
};

ControllerRoom.prototype.commandCreeps = function () {
	var cc = new ControllerCreep(this);
	var creeps = this.find(FIND_MY_CREEPS);

	for (var c in creeps) {
		cc.run(creeps[c]);
	}
};

ControllerRoom.prototype.populate = function () {
	if (Game.time % global.getFixedValue('checkPopulation') !== 0) return;

	var spawn = null;

	var roles = global.getCreepRoles();
	var cfgCreeps = global.getCreepsConfig();

	if (spawn === null) spawn = this.getIdleSpawn();
	if (spawn === null) return;

	for (var i in roles) {
		var role = roles[i];

		var cfg = cfgCreeps[role];
		if (!cfg.produceGlobal || cfg.produceGlobal === false) {
			if (this._shouldCreateCreep(role, cfg)) {
				var result = spawn.createCreep(role, cfg);
				return;
			}
		}
	}
};

ControllerRoom.prototype.getTransportOrder = function (Creep) {
	let givesResources = this.givesResources();
	let needsResources = this.needsResources();

	for (var g in givesResources) {
		let give = givesResources[g];
		for (var n in needsResources) {
			let need = needsResources[n];
			// TODO getCreeps needs to be better. Should calculate if more amount is needed...
			if (give.resourceType === need.resourceType && give.priority > need.priority && need.id !== give.id && this.getCreeps(null, give.id).length == 0) {
				// There was a problem with the check if a creep is already on the way. The controller Container is the target of the upgraders. Need another solution or an exception.
				// if (give.resourceType === need.resourceType && give.priority > need.priority && need.id !== give.id) {
				Log.debug(`${this.room.name} ${need.structureType} (${need.priority}) needs ${_.min([need.amount,give.amount])} ${global.resourceImg(need.resourceType)} from ${give.structureType} (${give.priority}) which has ${give.amount}`, "getTransportOrder")
				return give;
			}
		}
	}
	return null;
};

ControllerRoom.prototype.getDeliveryOrder = function (Creep) {
	let needsResources = this.needsResources();

	for (var n in needsResources) {
		let need = needsResources[n];
		// TODO getCreeps needs to be better. Should calculate if more amount is needed...
		if (need.resourceType === Creep.memory.resourceType && this.getCreeps(null, need.id).length == 0) {
			// There was a problem with the check if a creep is already on the way. The controller Container is the target of the upgraders. Need another solution or an exception.
			// if (need.resourceType === Creep.memory.resourceType) {
			Log.debug(`${this.room.name} ${Creep.name} transports ${_.min([Creep.amount,need.amount])} ${global.resourceImg(need.resourceType)} to ${need.structureType}`, "getDeliveryOrder");
			return need;
		}
	}
	return null;
};

ControllerRoom.prototype.givesResources = function () {
	const self = this;

	if (!this._givesResources) {
		this._givesResources = [];

		let prio = 50;

		this.find(FIND_TOMBSTONES).forEach(tombstone => {
			_.each(tombstone.store, function (amount, resourceType) {
				if (amount > 100) {
					self._givesResources.push({
						'priority': 165,
						'resourceType': resourceType,
						'structureType': tombstone.structureType,
						'amount': amount,
						'id': tombstone.id
					})
				};
			});
		});

		// Links
		for (var l of _.filter(this.links.receivers, function (l) {
				return l.energy > 0 && !l.pos.inRangeTo(l.room.controller.pos, 3);
			})) {
			self._givesResources.push({
				'priority': 200,
				'resourceType': "energy",
				'structureType': l.structureType,
				'amount': l.energy,
				'id': l.id
			})
		}

		// Dropped Resources
		for (var s of this.find(FIND_DROPPED_RESOURCES)) {
			if (s.amount > 100 && !s.pos.inRangeTo(this.room.controller.pos, 3)) {
				self._givesResources.push({
					'priority': 170,
					'resourceType': s.resourceType,
					'amount': s.amount,
					'id': s.id
				})
			};
		}

		// Containers
		var containers = []
		var sources = this.getSources();
		for (var s of sources) {
			if (s && s.container) {
				containers.push(s.container)
			};
		};

		if (this.room.extractor && this.room.extractor.container) {
			containers.push(this.room.extractor.container)
		}

		// TODO Do not get from container if energy + link is near
		_.each(containers, function (c) {
			if (c && c.store && c.store !== undefined) {
				_.each(c.store, function (amount, resourceType) {
					if (amount > 600) {
						self._givesResources.push({
							'priority': 195,
							'resourceType': resourceType,
							'structureType': c.structureType,
							'amount': amount,
							'id': c.id
						})
					};
				});
			}
		});
		let sto = this.room.storage;
		let ter = this.room.terminal;

		let minEnergyThreshold = global.getFixedValue('minEnergyThreshold');

		if (sto) {
			for (var r of RESOURCES_ALL) {
				// Energy
				let amount = 0;
				if (r === "energy" && sto.store[r] <= minEnergyThreshold) {
					prio = 40;
					amount = sto.store[r]
				} else if (r === "energy" && sto.store[r] > minEnergyThreshold) {
					prio = 120;
					amount = sto.store[r] - minEnergyThreshold;
				} else {
					// TODO 2 different options needed (prio 100 + 150)
					// Minerals
					prio = 100;
					amount = sto.store[r];
				}

				if (sto.store[r] > 0) {
					self._givesResources.push({
						'priority': prio,
						'structureType': sto.structureType,
						'resourceType': r,
						'amount': amount,
						'id': sto.id
					})
				}
			}
		}

		if (ter) {
			for (var r of RESOURCES_ALL) {
				let amount = 0;
				if (r === "energy" && ter.store[r] <= 50000) {
					prio = 35;
					amount = ter.store[r];
				} else if (r === "energy" && ter.store[r] > 50000) {
					prio = 140;
					amount = ter.store[r] - 50000;
				} else if (r !== "energy" && ter.store[r] > 0) {
					prio = 130;
					amount = ter.store[r];
				} else {
					continue;
				}

				self._givesResources.push({
					'priority': prio,
					'structureType': ter.structureType,
					'resourceType': r,
					'amount': amount,
					'id': ter.id
				})

			}
		}
		this._givesResources.sort((a, b) => {
			return b.priority - a.priority;
		});
	}
	return this._givesResources;
};

ControllerRoom.prototype.needsResources = function () {
	const self = this;
	if (!this._needsResources) {
		this._needsResources = [];


		let prio = 65;
		if (this.room.controller && this.room.controller.ticksToDowngrade < 100) {
			prio = 10;
		} else if (this.room.controller && this.room.controller.ticksToDowngrade < 1000) {
			prio = 25;
		}
		//	Fill Upgrader directly, if no container in position
		if (this.room.controller && !this.room.controller.container) {
			let upgrader = this.getCreeps('upgrader')
			for (var u of upgrader) {
				self._needsResources.push({
					'priority': prio,
					'resourceType': "energy",
					'amount': (u.store.getFreeCapacity(RESOURCE_ENERGY)),
					'id': u.id
				})
			}
		}

		let con = this.getControllerNotFull();
		if (con && con != null) {
			self._needsResources.push({
				'priority': prio,
				'structureType': con.structureType,
				'resourceType': "energy",
				'amount': (con.store.getFreeCapacity(RESOURCE_ENERGY)),
				'id': con.id
			})
		}

		let spa = this.getSpawnsNotFull();
		for (var s of spa) {
			self._needsResources.push({
				'priority': 15,
				'structureType': s.structureType,
				'resourceType': "energy",
				'amount': (s.store.getFreeCapacity(RESOURCE_ENERGY)),
				'id': s.id
			})
		}

		let ext = this.getExtensionsNotFull();
		for (var l of ext) {
			self._needsResources.push({
				'priority': 20,
				'structureType': l.structureType,
				'resourceType': "energy",
				'amount': (l.store.getFreeCapacity(RESOURCE_ENERGY)),
				'id': l.id
			})
		}

		if (this.getEnemys().length > 0) {
			prio = 30
		} else {
			prio = 60
		}
		// let tow = this.structureNeedResource(this.room.towers, RESOURCE_ENERGY);
		let tow = this.getTowersNotFull();
		for (var t of tow) {
			self._needsResources.push({
				'priority': prio,
				'structureType': t.structureType,
				'resourceType': "energy",
				'amount': (t.store.getFreeCapacity(RESOURCE_ENERGY)),
				'id': t.id
			})
		}
		// TODO Do not feed full constructors? Will not happen too often
		let constructor = this.getCreeps('constructor')
		for (var constr of constructor) {
			self._needsResources.push({
				'priority': 50,
				'structureType': constr.structureType,
				'resourceType': "energy",
				'amount': constr.store.getFreeCapacity(RESOURCE_ENERGY),
				'id': constr.id
			})
		}

		// TODO Add labs resources
		let lab = this.getLabsNotFull();
		for (var l of lab) {
			self._needsResources.push({
				'priority': 75,
				'structureType': l.structureType,
				'resourceType': "energy",
				'amount': (l.store.getFreeCapacity(RESOURCE_ENERGY)),
				'id': l.id
			})
		}

		let p = this.structureNeedResource(this.room.powerSpawn, RESOURCE_ENERGY);
		if (p && p > 400) {
			self._needsResources.push({
				'priority': 110,
				'structureType': this.room.powerSpawn.structureType,
				'resourceType': "energy",
				'amount': p,
				'id': this.room.powerSpawn.id
			})
		}

		let p2 = this.structureNeedResource(this.room.powerSpawn, RESOURCE_POWER);
		if (p2 && p2 > 20) {
			self._needsResources.push({
				'priority': 90,
				'structureType': this.room.powerSpawn.structureType,
				'resourceType': "power",
				'amount': p2,
				'id': this.room.powerSpawn.id,
				'exact': true
			})
		}


		let n = this.structureNeedResource(this.room.nuker, RESOURCE_ENERGY);
		if (n && n > 0) {
			self._needsResources.push({
				'priority': 115,
				'structureType': this.room.nuker.structureType,
				'resourceType': "energy",
				'amount': n,
				'id': this.room.nuker.id
			})
		}

		let n2 = this.structureNeedResource(this.room.nuker, RESOURCE_GHODIUM);
		if (n2 && n2 > 0) {
			self._needsResources.push({
				'priority': 95,
				'structureType': this.room.nuker.structureType,
				'resourceType': "G",
				'amount': n2,
				'id': this.room.nuker.id,
				'exact': true
			})
		}


		let minResourceThreshold = global.getFixedValue('minResourceThreshold');
		let minEnergyThreshold = global.getFixedValue('minEnergyThreshold');
		let storageMaxEnergyAmount = global.getFixedValue('storageMaxEnergyAmount');

		let sto = this.room.storage;
		let ter = this.room.terminal;

		if (sto && _.sum(sto.store) < sto.store.getCapacity()) {
			for (var r of RESOURCES_ALL) {
				let amount = 0;
				if (r === 'energy' && (sto.store[r] === undefined || sto.store[r] < minEnergyThreshold)) {
					prio = 55;
					amount = minEnergyThreshold - (sto.store[r] || 0);

				} else if (r === 'energy' && ((sto.store[r] >= minEnergyThreshold) && (sto.store[r] <= storageMaxEnergyAmount))) {
					prio = 125;
					amount = storageMaxEnergyAmount - (sto.store[r] || 0);
				} else if (r !== 'energy' && (sto.store[r] < minResourceThreshold)) {
					prio = 105;
					amount = minResourceThreshold - sto.store[r];
				} else {
					continue;
				}

				self._needsResources.push({
					'priority': prio,
					'structureType': sto.structureType,
					'resourceType': r,
					'amount': amount,
					'id': sto.id,
					'exact': true
				})
			}
		}

		if (ter && ter.store.getFreeCapacity() > 0) {
			for (var r of RESOURCES_ALL) {
				let amount = 0;
				if (r === 'energy' && (ter.store[r] === undefined || ter.store[r] < 50000)) {
					prio = 45;
					amount = 50000 - (ter.store[r] || 0);
				} else if (r === 'energy') {
					prio = 145;
					amount = ter.store.getFreeCapacity();
				} else if (r !== 'energy') {
					prio = 135;
					amount = ter.store.getFreeCapacity();

				}
				self._needsResources.push({
					'priority': prio,
					'structureType': ter.structureType,
					'resourceType': r,
					'amount': amount,
					'id': ter.id,
					'exact': true
				})
			}
		}
		// Sortieren nach Prio
		this._needsResources.sort((a, b) => {
			return a.priority - b.priority;
		});
	}
	return this._needsResources;
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

// Also finds creeps that are spawning (getCreeps does not)
ControllerRoom.prototype.getAllCreeps = function (role) {
	var room = this.room
	var creeps = []
	if (role) {
		creeps = Object.values(Game.creeps).filter(c => c.memory.role === role && c.room === room);
	} else {
		creeps = Object.values(Game.creeps).filter(c => c.room === room);
	}
	return creeps;
};

ControllerRoom.prototype.findNearLink = function (obj) {
	let allLinks = this.room.links;
	let thelink = obj.pos.findInRange(allLinks, 3);
	if (thelink.length > 0) {
		let link = thelink[0];
		return link;
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
	var controller = this.room.controller;
	if (controller !== null && controller.my) {
		return controller.level;
	}
	return 0;
};

ControllerRoom.prototype.structureNeedResource = function (structure, resource) {
	if (structure) {
		return structure.store.getFreeCapacity(resource);
	} else {
		return null;
	}
};

ControllerRoom.prototype.getDroppedResourcesAmount = function () {
	let amount = 0;
	for (var s of this.find(FIND_DROPPED_RESOURCES)) {
		amount += s.amount;
	};
	return amount;
};

ControllerRoom.prototype.getControllerNotFull = function () {
	if (!this._controllerNF) {
		this._controllerNF = null;

		let controllerz = this.room.controller;
		if (controllerz) {
			let containerId = controllerz.memory.containerID || null;
			if (containerId != null) {
				var container = Game.getObjectById(containerId);
				if (container != null) {
					if (container.store && container.store[RESOURCE_ENERGY] + 800 < container.store.getCapacity(RESOURCE_ENERGY)) {
						this._controllerNF = container
					}
				}
			}
		}
		return this._controllerNF;
	}
};

ControllerRoom.prototype.getStorageNotFull = function () {
	if (!this._storage) {
		this._storage = _.filter(this.find(FIND_MY_STRUCTURES), function (e) {
			return e.structureType === STRUCTURE_STORAGE && e.store.getFreeCapacity()
		});
	}
	return this._storage;
};

ControllerRoom.prototype.getIdleSpawn = function () {

	for (var i in this._spawns) {
		var sc = this._spawns[i];
		var idleSpawn = sc.isIdle();
		if (idleSpawn) {
			return sc;
		}
	}
	return null;
};

ControllerRoom.prototype.getIdleSpawnObject = function () {

	for (var i in this.room.spawns) {
		var sc = this.room.spawns[i];
		if (!sc.spawning) {
			return sc;
		}
	}
	return null;
};

ControllerRoom.prototype.getSpawnsNotFull = function () {
	if (!this._spawnsNF) {
		let spawnz = this.room.spawns;
		this._spawnsNF = _.filter(spawnz, function (e) {
			return e.energy < e.store.getCapacity(RESOURCE_ENERGY);
		});
	}
	return this._spawnsNF;
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

// TODO  Cleanup ControllerRoom (getController, getControllerFull etc.)
ControllerRoom.prototype.getExtensionsNotFull = function () {
	if (!this._extensionsNF) {
		let extensions = this.room.extensions;
		if (extensions) {
			this._extensionsNF = _.filter(extensions, function (e) {
				return e.energy < e.store.getCapacity(RESOURCE_ENERGY);
			});
		} else {
			return null;
		}
	}
	return this._extensionsNF;
};

ControllerRoom.prototype.getLabsNotFull = function () {
	if (!this._myLabsNF) {
		let labs = this.room.labs;
		this._myLabsNF = _.filter(labs, function (e) {
			return e.energy < e.store.getCapacity(RESOURCE_ENERGY);
		});
	}
	return this._myLabsNF;
};

ControllerRoom.prototype.getNukerNotFull = function () {
	if (!this._myNukerNF) {
		let nuker = this.room.nuker;
		this._myNukerNF = _.filter(nuker, function (e) {
			return e.getFreeCapacity(RESOURCE_ENERGY) > 0;
		});
	}
	return this._myNukerNF;
};

ControllerRoom.prototype.getTowersNotFull = function () {
	if (!this._myTowersNF) {
		let towers = this.room.towers;
		this._myTowersNF = _.filter(towers, function (s) {
			if (s.structureType === STRUCTURE_TOWER) {
				return s.energy < (s.store.getCapacity(RESOURCE_ENERGY) - 100);
			}
		});
	}
	return this._myTowersNF;
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

ControllerRoom.prototype.findStructuresToRepair = function () {
	// TODO First repair Ramparts! Not walls...
	var structures = _.filter(this.find(FIND_STRUCTURES), function (s) {
		return s.needsRepair();
	});

	let theStructure = _.sortBy(structures, function (s) {
		return s.hits;
	});

	return theStructure
}

ControllerRoom.prototype._shouldCreateCreep = function (role, cfg) {
	var level = this.getLevel();
	var lReq = cfg.levelMin || 1;
	var lMax = cfg.levelMax || 10;
	if (level < lReq) return false;
	if (lMax < level) return false;
	if ((cfg.wait4maxEnergy == true) && (this.room.energyCapacityAvailable > this.room.energyAvailable)) return false;
	if (!cfg.canBuild) {
		console.log(role + " : no canBuild() implemented");
		return false;
	}

	return cfg.canBuild(this);
};

ControllerRoom.prototype.centerPoint = function () {

	const freeRange = 3;
	var bestPos;

	for (let x = 3; x < 46; x++) {
		for (let y = 3; y < 46; y++) {
			let pos = new RoomPosition(x, y, this.room.name);

			let exits = pos.findInRange(FIND_EXIT, freeRange);
			if (exits.length > 0) continue;

			let structs = pos.findInRange(FIND_STRUCTURES, freeRange, {
				filter: (s) => s.structureType != STRUCTURE_ROAD
			});
			if (structs.length > 0) continue;

			let terrain = _.filter(this.room.lookForAtArea(LOOK_TERRAIN, y - freeRange, x - freeRange, y + freeRange, x + freeRange, true), (p) => p.type == 'terrain' && p.terrain == 'wall');
			if (terrain.length > 0) continue;

			let goodPos = new RoomPosition(x, y, this.room.name);

			let toSource = [];
			let toController;

			_.forEach(this.find(FIND_SOURCES), (s) => {
				toSource.push(this.room.findPath(goodPos, s.pos, {
					ignoreCreeps: true,
					ignoreRoads: true,
					maxRooms: 1
				}).length);
			});

			toController = this.room.findPath(goodPos, this.room.controller.pos, {
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

	Log.error(`Check bug in function centerPoint: ${bestPos.x} ${bestPos.y} ${this.room.name}`, "internalTrade")
	let thePosition = new RoomPosition(bestPos.x, bestPos.y, this.room.name);
	return thePosition;
	// this.createFlag(bestPos.x, bestPos.y, 'CenterPoint:' + this.name, COLOR_PURPLE, COLOR_BLUE);
};

ControllerRoom.prototype.analyse = function () {

	if (Game.cpu.tickLimit <= global.getFixedValue('noAnalyseLimit')) return;
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