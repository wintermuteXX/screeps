define(Creep, "hitsLost", (self) => self.hitsMax - self.hits);
[
    StructureSpawn,
    StructureStorage,
    StructureExtension,
    StructureLink,
    StructureLab,
    StructureNuker,
    StructurePowerSpawn,
    StructureTerminal,
    StructureTower,
    StructureContainer
].forEach(function(type) {
    define(type, "Energy", (self) => [STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_TERMINAL].includes(self.structureType)
        ? ({current: self.store[RESOURCE_ENERGY], max: self.storeCapacity - _.sum(self.store) + self.store[RESOURCE_ENERGY]})
        : ({current: self.energy, max: self.energyCapacity}));
    define(type, "EnergyPercent", (self) => Math.round((self.Energy.current/self.Energy.max)*100));
    define(type, "Health", (self) => ({current: self.hits, max: self.hitsMax}));
    define(type, "HealthPercent", (self) => Math.round((self.Health.current/self.Health.max)*100));
});
define(Structure, "mem", (self) => Memory.idData[self.id] === undefined ? Memory.idData[self.id] = {} : Memory.idData[self.id]);
define(Creep, "Health", (self) => ({current: self.hits, max: self.hitsMax}));
define(Creep, "HealthPercent", (self) => Math.round((self.Health.current/self.Health.max)*100));
define(Creep, "Energy", (self) => ({current: self.carry[RESOURCE_ENERGY], max: self.carryCapacity - _.sum(self.carry) + self.carry[RESOURCE_ENERGY]}));
define(Creep, "EnergyPercent", (self) => Math.round((self.Energy.current/self.Energy.max)*100));