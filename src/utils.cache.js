/**
 * Cache Manager for tick-based caching
 *
 * Automatically clears cache when Game.time changes.
 * Reduces CPU usage by caching expensive operations per tick.
 *
 * CACHING STRATEGY:
 * ================
 *
 * This cache manager implements a tick-level caching strategy for Screeps.
 * All cached values are automatically cleared when Game.time changes, ensuring
 * data consistency across ticks.
 *
 * WHEN TO USE CACHING:
 * --------------------
 * Use caching for operations that:
 * 1. Are expensive (CPU-intensive) and called multiple times per tick
 * 2. Return the same result within a single tick
 * 3. Don't depend on external state that changes during a tick
 *
 * GOOD CANDIDATES FOR CACHING:
 * - Room.find() operations (enemies, structures, etc.)
 * - Structure lookups (room.towers, room.spawns, etc.)
 * - Pathfinding results (if path doesn't change during tick)
 * - Creep body calculations (getHarvestPowerPerTick, etc.)
 * - Room analysis results
 * - Structure counts by type
 *
 * BAD CANDIDATES FOR CACHING:
 * - Operations that depend on creep actions (store amounts, positions)
 * - Operations that need real-time updates (enemy positions during combat)
 * - Operations that are already fast (< 0.1 CPU)
 * - Operations that are only called once per tick
 *
 * USAGE EXAMPLES:
 * --------------
 *
 * // Cache expensive find() operation
 * const enemies = cache.get('enemies', () => room.find(FIND_HOSTILE_CREEPS));
 *
 * // Cache structure counts
 * const towerCount = cache.get('towerCount', () => room.towers.length);
 *
 * // Cache computed values
 * const harvestPower = cache.get(`harvest_${creep.id}`, () => {
 *   return creep.getHarvestPowerPerTick();
 * });
 *
 * PERFORMANCE NOTES:
 * -----------------
 * - Cache automatically clears on tick change (no manual cleanup needed)
 * - Map-based storage for O(1) lookup performance
 * - Memory overhead is minimal (only stores references, not copies)
 * - Use descriptive cache keys to avoid collisions
 *
 * BEST PRACTICES:
 * ---------------
 * 1. Use descriptive cache keys: 'enemies_roomName', 'towers_roomName'
 * 2. Include room/creep IDs in keys when caching per-object data
 * 3. Don't cache mutable objects that might be modified
 * 4. Cache at the highest level possible (room-level > creep-level)
 * 5. Monitor cache size in development (use cache.size())
 */
class CacheManager {
  constructor() {
    this._cache = new Map();
    this._tick = null;
  }

  /**
   * Get a cached value or compute it using the factory function
   * @param {string} key - Cache key
   * @param {Function} factory - Factory function that computes the value if not cached
   * @returns {*} The cached or computed value
   */
  get(key, factory) {
    // Clear cache if tick changed
    if (this._tick !== Game.time) {
      this._cache.clear();
      this._tick = Game.time;
    }

    // Return cached value if exists
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    // Compute and cache new value
    const value = factory();
    this._cache.set(key, value);
    return value;
  }

  /**
   * Manually set a cache value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  set(key, value) {
    // Clear cache if tick changed
    if (this._tick !== Game.time) {
      this._cache.clear();
      this._tick = Game.time;
    }

    this._cache.set(key, value);
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    // Clear cache if tick changed
    if (this._tick !== Game.time) {
      this._cache.clear();
      this._tick = Game.time;
    }

    return this._cache.has(key);
  }

  /**
   * Clear the cache manually
   */
  clear() {
    this._cache.clear();
    this._tick = null;
  }

  /**
   * Get cache size (for debugging)
   * @returns {number} Number of cached entries
   */
  size() {
    return this._cache.size;
  }
}

module.exports = CacheManager;

