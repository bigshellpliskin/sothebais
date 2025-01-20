import { IAgentRuntime } from "@elizaos/core";
export interface DatabaseConfig {
    type: 'sqlite' | 'postgres';
    connection: any;
}
export interface QueryOptions {
    tableName: string;
    filter?: Record<string, any>;
    limit?: number;
    offset?: number;
}
export declare class DatabaseAdapter {
    private runtime;
    private config;
    constructor(runtime: IAgentRuntime, config: DatabaseConfig);
    initialize(): Promise<void>;
    private initializeSqlite;
    private initializePostgres;
    execute(query: string, params?: any[]): Promise<any>;
    query(options: QueryOptions): Promise<any[]>;
    insert(tableName: string, data: Record<string, any>): Promise<void>;
    update(tableName: string, id: string, data: Record<string, any>): Promise<void>;
}
