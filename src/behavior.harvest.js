const Behavior = require("_behavior");

/**
 * Counts how many creeps are currently targeting a source
 * @param {Source} source - The source to check
 * @param {any} rc - The room controller
 * @returns {number} Number of creeps targeting this source
 */
function countCreepsTargetingSource(source, rc) {
  // Get all creeps that have this source as their target
  const creepsWithTarget = rc.getCreeps(null, source.id);
  return creepsWithTarget.length;
}

/**
 * Selects the best source with available space
 * @param {Source[]} sources - Array of available sources
 * @param {any} rc - The room controller
 * @returns {Source|null} Best source or null if none available
 */
function selectBestSource(sources, rc) {
  const availableSources = [];
  
  for (const source of sources) {
    const freeSpaces = source.freeSpacesCount;
    const creepsTargeting = countCreepsTargetingSource(source, rc);
    const availableSpaces = freeSpaces - creepsTargeting;
    
    if (availableSpaces > 0) {
      availableSources.push({
        source: source,
        availableSpaces: availableSpaces,
        freeSpaces: freeSpaces
      });
    }
  }
  
  if (availableSources.length === 0) {
    return null;
  }
  
  // Sort by available spaces (descending) and select randomly from top sources
  availableSources.sort((a, b) => b.availableSpaces - a.availableSpaces);
  
  // Get sources with the most available spaces
  const maxAvailable = availableSources[0].availableSpaces;
  const topSources = availableSources.filter(s => s.availableSpaces === maxAvailable);
  
  // Select randomly from top sources
  const selected = topSources[Math.floor(Math.random() * topSources.length)];
  return selected.source;
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
      target = selectBestSource(sources, rc);
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
