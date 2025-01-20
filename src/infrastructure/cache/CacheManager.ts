interface CacheConfig {
    type: 'memory' | 'redis';
    ttl: number; // Time to live in seconds
    maxSize?: number; // Maximum number of items for memory cache
    connection?: any; // Redis connection details if using redis
}

interface CacheEntry<T = any> {
    value: T;
    expiry: number;
}

export class CacheManager {
    private config: CacheConfig;
    private cache: Map<string, CacheEntry> | any; // Map for memory cache, Redis client for redis

    constructor(config: CacheConfig) {
        this.config = config;
    }

    async initialize(): Promise<void> {
        if (this.config.type === 'memory') {
            this.cache = new Map<string, CacheEntry>();
            // Cleanup loop for memory cache
            setInterval(() => this.cleanup(), 60000); // Run cleanup every minute
        } else {
            // Initialize Redis connection
            // Implementation would go here
        }
    }

    private async cleanup(): Promise<void> {
        if (this.config.type === 'memory') {
            const now = Date.now();
            for (const [key, value] of this.cache.entries()) {
                if (value.expiry < now) {
                    this.cache.delete(key);
                }
            }

            // Enforce maxSize if specified
            if (this.config.maxSize && this.cache.size > this.config.maxSize) {
                const entriesToRemove = this.cache.size - this.config.maxSize;
                const entries = Array.from(this.cache.entries()) as [string, CacheEntry][];
                entries
                    .sort((a, b) => a[1].expiry - b[1].expiry)
                    .slice(0, entriesToRemove)
                    .forEach((entry) => this.cache.delete(entry[0]));
            }
        }
    }

    async get<T>(key: string): Promise<T | null> {
        if (this.config.type === 'memory') {
            const item = this.cache.get(key);
            if (!item) return null;
            
            if (item.expiry < Date.now()) {
                this.cache.delete(key);
                return null;
            }
            
            return item.value;
        } else {
            // Redis implementation
            // Would go here
            return null;
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        const expiry = Date.now() + (ttl || this.config.ttl) * 1000;

        if (this.config.type === 'memory') {
            this.cache.set(key, { value, expiry });
            
            // Cleanup if maxSize exceeded
            if (this.config.maxSize && this.cache.size > this.config.maxSize) {
                await this.cleanup();
            }
        } else {
            // Redis implementation
            // Would go here
        }
    }

    async delete(key: string): Promise<void> {
        if (this.config.type === 'memory') {
            this.cache.delete(key);
        } else {
            // Redis implementation
            // Would go here
        }
    }

    async clear(): Promise<void> {
        if (this.config.type === 'memory') {
            this.cache.clear();
        } else {
            // Redis implementation
            // Would go here
        }
    }
}