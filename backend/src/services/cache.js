class Cache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes default TTL
    this.map = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.timestamps = new Map();
  }

  get(key) {
    const item = this.map.get(key);
    if (!item) return null;
    
    const timestamp = this.timestamps.get(key);
    if (Date.now() - timestamp > this.ttl) {
      this.delete(key);
      return null;
    }
    
    return item;
  }

  set(key, value) {
    // Evict oldest if at max size
    if (this.map.size >= this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      this.delete(oldestKey);
    }
    
    this.map.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  delete(key) {
    this.map.delete(key);
    this.timestamps.delete(key);
  }

  async getOrSet(key, fn) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    
    const value = await fn();
    this.set(key, value);
    return value;
  }

  clear() {
    this.map.clear();
    this.timestamps.clear();
  }

  size() {
    return this.map.size;
  }

  // Batch operations for better performance
  async getOrSetBatch(keys, fn) {
    const results = {};
    const missingKeys = [];
    
    for (const key of keys) {
      const cached = this.get(key);
      if (cached !== null) {
        results[key] = cached;
      } else {
        missingKeys.push(key);
      }
    }
    
    if (missingKeys.length > 0) {
      const newValues = await fn(missingKeys);
      for (const key of missingKeys) {
        if (newValues[key] !== undefined) {
          this.set(key, newValues[key]);
          results[key] = newValues[key];
        }
      }
    }
    
    return results;
  }
}

module.exports = { Cache }; 