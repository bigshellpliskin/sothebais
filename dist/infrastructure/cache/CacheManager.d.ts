export interface CacheConfig {
    type: 'memory' | 'redis';
    ttl: number;
    maxSize?: number;
    connection?: any;
}
export declare class CacheManager {
    private config;
    private cache;
    constructor(config: CacheConfig);
    initialize(): Promise<void>;
    private cleanup;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
