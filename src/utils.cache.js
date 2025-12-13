/**
 * Cache Manager for tick-based caching
 *
 * Automatically clears cache when Game.time changes.
 * Reduces CPU usage by caching expensive operations per tick.
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

