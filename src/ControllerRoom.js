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

	var towers = this.getTowers();

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

	this.findResources();
	this.needResources();
	// let test = this.getTransportOrder();
	// console.log(this.room.name + " " + JSON.stringify(test, null, 4));
	// this.givesResources();
	// this.needsResources();

	if (Game.time % global.getFixedValue('internalTrade') === 0 && Game.cpu.tickLimit > 50) {
		this.terminal.internalTrade();
	}

	if (Game.time % global.getFixedValue('sellOverflow') === 0 && Game.cpu.tickLimit > 50) {
		this.terminal.sellOverflow();
	}

	if (Game.time % global.getFixedValue('buyEnergyOrder') === 0 && Game.cpu.tickLimit > 50) {
		this.terminal.buyEnergyOrder();
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

ControllerRoom.prototype.getTransportOrder = function () {
	let givesResources = this.givesResources();
	let needsResources = this.needsResources();

	for (var g in givesResources) {
		let give = givesResources[g];
		for (var n in needsResources) {
			let need = needsResources[n];
			if (give.resourceType === need.resourceType && give.priority > need.priority && need.id !== give.id) {
				Log.debug(`${this.room.name} ${need.structureType} (${need.priority}) needs ${_.min([need.amount,give.amount])} ${global.resourceImg(need.resourceType)} from ${give.structureType} (${give.priority}) which has ${give.amount}`, "getTransportOrder")
				return need;
			}

		}
	}

};

// LONGTERM Rework needRessources (not in Memory + calculate creeps who already transport stuff)
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
		// TEST does link work? () looks wrong
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
		// TODO Do not get every energy pile (maybe > 100?)
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
					if (amount > 200) {
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
		let [sto] = this.getStorage();
		let [ter] = this.getTerminal();

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
				if (r === "energy" && ter.store[r] <= minEnergyThreshold) {
					prio = 35;
					amount = ter.store[r];
				} else if (r === "energy" && ter.store[r] > minEnergyThreshold) {
					prio = 140;
					amount = ter.store[r] - minEnergyThreshold;
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
}

ControllerRoom.prototype.needsResources = function () {
	const self = this;
	if (!this._needsResources) {
		this._needsResources = [];


		let prio = 50;
		if (this.room.controller.ticksToDowngrade < 100) {
			prio = 10;
		} else if (this.room.controller.ticksToDowngrade < 1000) {
			prio = 25;
		}
		//	Fill Upgrader directly, if no container in position
		if (!this.room.controller.container) {
			let upgrader = this.getCreeps('upgrader')
			for (var u of upgrader) {
				self._needsResources.push({
					'priority': prio,
					'resourceType': "energy",
					'amount': (u.energyCapacity - u.energy),
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
				'amount': (con.storeCapacity - _.sum(con.store)),
				'id': con.id
			})
		}

		let spa = this.getSpawnsNotFull();
		for (var s of spa) {
			self._needsResources.push({
				'priority': 15,
				'structureType': s.structureType,
				'resourceType': "energy",
				'amount': (s.energyCapacity - s.energy),
				'id': s.id
			})
		}

		let ext = this.getExtensionsNotFull();
		for (var l of ext) {
			self._needsResources.push({
				'priority': 20,
				'structureType': l.structureType,
				'resourceType': "energy",
				'amount': (l.energyCapacity - l.energy),
				'id': l.id
			})
		}

		if (this.getEnemys().length > 0) {
			prio = 30
		} else {
			prio = 65
		}

		let tow = this.getTowersNotFull();
		for (var t of tow) {
			self._needsResources.push({
				'priority': prio,
				'structureType': t.structureType,
				'resourceType': "energy",
				'amount': (t.energyCapacity - t.energy),
				'id': t.id
			})
		}

		let constructor = this.getCreeps('constructor')
		for (var constr of constructor) {
			self._needsResources.push({
				'priority': 50,
				'structureType': constr.structureType,
				'resourceType': "energy",
				'amount': (constr.energyCapacity - constr.energy),
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
				'amount': (l.energyCapacity - l.energy),
				'id': l.id
			})
		}

		// TODO Add power
		let pow = this.getPowerSpawnNotFull();
		for (var p of pow) {
			self._needsResources.push({
				'priority': 110,
				'structureType': p.structureType,
				'resourceType': "energy",
				'amount': (p.energyCapacity - p.energy),
				'id': p.id
			})
		}

		// TODO Add ghodium
		let nuk = this.getNukerNotFull();
		for (var n of nuk) {
			self._needsResources.push({
				'priority': 115,
				'structureType': n.structureType,
				'resourceType': "energy",
				'amount': (n.energyCapacity - n.energy),
				'id': n.id
			})
		}

		let minResourceThreshold = global.getFixedValue('minResourceThreshold');
		let minEnergyThreshold = global.getFixedValue('minEnergyThreshold');

		let [sto] = this.getStorage();
		let [ter] = this.getTerminal();

		if (sto && _.sum(sto.store) < sto.storeCapacity) {
			for (var r of RESOURCES_ALL) {
				let amount = 0;
				if (r === 'energy' && (sto.store[r] === undefined || sto.store[r] < minEnergyThreshold)) {
					prio = 60;
					amount = minEnergyThreshold - (sto.store[r] || 0);
					// TODO Make 100000 configurable
				} else if (r === 'energy' && ((sto.store[r] >= minEnergyThreshold) && (sto.store[r] <= 100000))) {
					prio = 125;
					amount = minEnergyThreshold - (sto.store[r] || 0);
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
					'id': sto.id
				})
			}
		}

		if (ter && _.sum(ter.store) < ter.storeCapacity) {
			for (var r of RESOURCES_ALL) {
				let amount = 0;
				if (r === 'energy' && (ter.store[r] === undefined || ter.store[r] < minEnergyThreshold)) {
					prio = 45;
					amount = minEnergyThreshold - (ter.store[r] || 0);
				} else if (r === 'energy') {
					prio = 145;
					amount = ter.storeCapacity - (_.sum(ter.store));
				} else if (r !== 'energy') {
					prio = 135;
					amount = ter.storeCapacity - (_.sum(ter.store));

				}
				self._needsResources.push({
					'priority': prio,
					'structureType': ter.structureType,
					'resourceType': r,
					'amount': amount,
					'id': ter.id
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

ControllerRoom.prototype.needResources = function () {
	if (Game.time % global.getFixedValue('checkResourcesQueue') !== 0) return;
	var memory = this.room.memory;
	var needResources = {};

	let spa = this.getSpawnsNotFull();
	for (var s of spa) {
		needResources[s.id + "|energy"] = {
			'resourceType': "energy",
			'amount': s.energyCapacity - s.energy,
			'id': s.id
		};
	}

	let ext = this.getExtensionsNotFull();
	for (var l of ext) {
		needResources[l.id + "|energy"] = {
			'resourceType': "energy",
			'amount': l.energyCapacity - l.energy,
			'id': l.id
		};
	}

	let tow = _.filter(this.find(FIND_MY_STRUCTURES), function (s) {
		if (s.structureType === STRUCTURE_TOWER) {
			return s.energy < (s.energyCapacity - 100);
		}
	});
	for (var t of tow) {
		needResources[t.id + "|energy"] = {
			'resourceType': "energy",
			'amount': t.energyCapacity - t.energy,
			'id': t.id
		};
	}

	let constructor = this.getCreeps('constructor')
	for (var constr of constructor) {
		if (constr.energyCapacity - constr.energy > 49) {
			needResources[constr.id + "|energy"] = {
				'resourceType': "energy",
				'amount': constr.energyCapacity - constr.energy,
				'id': constr.id
			};
		}
	}

	//	Fill Upgrader directly, if no container in position
	if (this.room.controller && !this.room.controller.container) {
		let upgrader = this.getCreeps('upgrader')
		for (var u of upgrader) {
			if (u.energyCapacity - u.energy > 49) {
				needResources[u.id + "|energy"] = {
					'resourceType': "energy",
					'amount': u.energyCapacity - u.energy,
					'id': u.id
				};
			}
		}
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

	let [sto] = this.getStorageNotFull();
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

ControllerRoom.prototype.findResources = function () {
	if (Game.time % global.getFixedValue('checkResourcesQueue') !== 0) return;
	var memory = this.room.memory;
	var existingResources = {};

	this.find(FIND_TOMBSTONES).forEach(tombstone => {
		_.each(tombstone.store, function (amount, resourceType) {
			if (amount > 100) {
				existingResources[tombstone.id + "|" + resourceType] = {
					'resourceType': resourceType,
					'amount': amount,
					'id': tombstone.id
				};
			};
		});
	});

	// Links
	for (var l of _.filter(this.links.receivers, function (l) {
			return l.energy > 0 && !l.pos.inRangeTo(l.room.controller.pos, 3);
		})) {
		existingResources[l.id + "|energy"] = {
			'resourceType': "energy",
			'amount': l.energy,
			'id': l.id
		};
	}

	// Dropped Resources
	for (var s of this.find(FIND_DROPPED_RESOURCES)) {
		if (s.amount > 100 && !s.pos.inRangeTo(this.room.controller.pos, 3)) {
			existingResources[s.id + "|" + s.resourceType] = {
				'resourceType': s.resourceType,
				'amount': s.amount,
				'id': s.id
			};
		};
	}


	// Containers
	var containers = []
	var sources = this.getSources();
	for (var s of sources) {
		if (s) {
			containers.push(s.container)
		};
	};

	if (this.room.extractor && this.room.extractor.container) {
		containers.push(this.room.extractor.container)
	}

	_.each(containers, function (c) {
		if (c && c.store) {
			if (c.store !== undefined) {
				_.each(c.store, function (amount, resourceType) {
					if (amount > 200) {
						existingResources[c.id + "|" + resourceType] = {
							'resourceType': resourceType,
							'amount': amount,
							'id': c.id
						};
					};
				});
			}
		}
	});

	var ter = this.getTerminal();
	var sto = this.getStorage();

	// Terminal
	if (ter && sto) {
		_.each(ter, function (t) {
			_.each(t.store, function (amount, resourceType) {
				if (sto[0].store[resourceType] === undefined || ((sto[0].store[resourceType] < 20000) && (resourceType !== 'energy')) || (resourceType == 'energy' && amount > 50000)) {
					existingResources[t.id + "|" + resourceType] = {
						'resourceType': resourceType,
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
					existingResources[s.id + "|" + resourceType] = {
						'resourceType': resourceType,
						'amount': amount,
						'id': s.id
					};
				};
			});
		});
	};

	memory.QueueAvailableResources = existingResources;
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
	let allLinks = this.getLinks();
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
	var controller = this.getController();
	if (controller !== null && controller.my) {
		return controller.level;
	}
	return 0;
};

ControllerRoom.prototype.getDroppedResourcesAmount = function () {
	let amount = 0;
	for (var s of this.find(FIND_DROPPED_RESOURCES)) {
		amount += s.amount;
	};
	return amount;
};

ControllerRoom.prototype.getController = function () {
	return this.room.controller || null;
};

ControllerRoom.prototype.getControllerNotFull = function () {
	if (!this._controllerNF) {
		this._controllerNF = null;

		let controllerz = this.getController();
		if (controllerz) {
			let containerId = controllerz.memory.containerID || null;
			if (containerId != null) {
				var container = Game.getObjectById(containerId);
				if (container != null) {
					if (container.store && container.store[RESOURCE_ENERGY] + 200 < container.storeCapacity) {
						this._controllerNF = container
					}
				}
			}
		}
		return this._controllerNF;
	}
};

ControllerRoom.prototype.getStorage = function () {
	if (!this._storage) {
		this._storage = _.filter(this.find(FIND_MY_STRUCTURES), {
			structureType: STRUCTURE_STORAGE
		});
	}
	return this._storage;
};

ControllerRoom.prototype.getStorageNotFull = function () {
	if (!this._storage) {
		this._storage = _.filter(this.find(FIND_MY_STRUCTURES), function (e) {
			return e.structureType === STRUCTURE_STORAGE && _.sum(e.store) < e.storeCapacity
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

// TODO  Cleanup ControllerRoom (getController, getControllerFull etc.)
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
	// BUG TypeError: Cannot read property 'substr' of undefined
	// at Object.exports.roomNameToXY (<runtime>:453:28)
	// at new RoomPosition (<runtime>:14852:82)
	// at ControllerRoom.centerPoint (ControllerRoom:889:20)

	Log.error(`Check bug in function centerPoint: ${bestPos.x} ${bestPos.y} ${this.room.name}`, "internalTrade")
	let thePosition = new RoomPosition(bestPos.x, bestPos.y, this.room.name);
	return thePosition;
	// this.createFlag(bestPos.x, bestPos.y, 'CenterPoint:' + this.name, COLOR_PURPLE, COLOR_BLUE);
};

ControllerRoom.prototype.getOneAvailableResource = function () {
	let resources = this.room.memory.QueueAvailableResources
	for (var resource in resources) {
		if (resources[resource].amount > 0 && this.getCreeps(null, resources[resource].id).length == 0) {
			return resources[resource]
		}
	}
	return null;
}

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