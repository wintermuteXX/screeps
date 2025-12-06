const Behavior = require("_behavior");

/**
 * Selects the best source using canHarvestSource and chooses the closest one
 * @param {Source[]} sources - Array of available sources
 * @param {Creep} creep - The creep that wants to harvest
 * @param {any} rc - The room controller
 * @returns {Source|null} Best source or null if none available
 */
function selectBestSource(sources, creep, rc) {
  const availableSources = [];
  
  for (const source of sources) {
    const harvestInfo = source.canHarvestSource(creep, rc);
    
    if (harvestInfo.canHarvest) {
      const distance = creep.pos.getRangeTo(source);
      availableSources.push({
        source: source,
        distance: distance,
        harvestInfo: harvestInfo
      });
    }
  }
  
  if (availableSources.length === 0) {
    return null;
  }
  
  // Sort by distance (ascending) - closest first
  availableSources.sort((a, b) => a.distance - b.distance);
  
  // Return the closest source
  return availableSources[0].source;
}

const b = new Behavior("harvest");

b.when = function (creep, rc) {
  const sources = rc.getSourcesNotEmpty();
  return creep.store.getUsedCapacity() === 0 && sources.length > 0;
};

b.completed = function (creep, rc) {
  if (!creep.getTarget()) return false;
  if (creep.getTarget().energy == 0) return true;
  return creep.store.getUsedCapacity() === creep.store.getCapacity(RESOURCE_ENERGY);
};

b.work = function (creep, rc) {
  let target = creep.getTarget();

  if (target === null) {
    const sources = rc.getSourcesNotEmpty();
    if (sources && sources.length) {
      target = selectBestSource(sources, creep, rc);
    }
  }

  if (target !== null) {
    creep.target = target.id;
    if (!creep.pos.isNearTo(target)) {
      creep.travelTo(target);
    } else {
      creep.harvest(target);
    }
  }
};

module.exports = b;
