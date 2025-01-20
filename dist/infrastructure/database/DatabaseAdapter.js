"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseAdapter = void 0;
class DatabaseAdapter {
    constructor(runtime, config) {
        this.runtime = runtime;
        this.config = config;
    }
    async initialize() {
        // Initialize database connection
        if (this.config.type === 'sqlite') {
            await this.initializeSqlite();
        }
        else {
            await this.initializePostgres();
        }
    }
    async initializeSqlite() {
        // Setup SQLite schema
        const queries = [
            `CREATE TABLE IF NOT EXISTS auctions (
                id TEXT PRIMARY KEY,
                tokenId TEXT NOT NULL,
                currentBid REAL,
                highestBidder TEXT,
                startTime DATETIME,
                endTime DATETIME,
                status TEXT,
                metadata JSON
            )`,
            `CREATE TABLE IF NOT EXISTS bids (
                id TEXT PRIMARY KEY,
                auctionId TEXT,
                bidder TEXT,
                amount REAL,
                timestamp DATETIME,
                status TEXT,
                FOREIGN KEY(auctionId) REFERENCES auctions(id)
            )`,
            `CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                type TEXT,
                data JSON,
                timestamp DATETIME
            )`
        ];
        for (const query of queries) {
            await this.execute(query);
        }
    }
    async initializePostgres() {
        // Similar to SQLite but with Postgres syntax
        // Implementation details would go here
    }
    async execute(query, params) {
        // Execute database query based on config.type
        return this.config.connection.execute(query, params);
    }
    async query(options) {
        const { tableName, filter = {}, limit = 100, offset = 0 } = options;
        // Build query based on filter
        const conditions = Object.entries(filter)
            .map(([key, value]) => `${key} = ?`)
            .join(' AND ');
        const query = `
            SELECT * FROM ${tableName}
            ${conditions ? `WHERE ${conditions}` : ''}
            LIMIT ${limit} OFFSET ${offset}
        `;
        return this.execute(query, Object.values(filter));
    }
    async insert(tableName, data) {
        const columns = Object.keys(data).join(', ');
        const values = Object.values(data);
        const placeholders = values.map(() => '?').join(', ');
        const query = `
            INSERT INTO ${tableName} (${columns})
            VALUES (${placeholders})
        `;
        await this.execute(query, values);
    }
    async update(tableName, id, data) {
        const setClause = Object.keys(data)
            .map(key => `${key} = ?`)
            .join(', ');
        const query = `
            UPDATE ${tableName}
            SET ${setClause}
            WHERE id = ?
        `;
        await this.execute(query, [...Object.values(data), id]);
    }
}
exports.DatabaseAdapter = DatabaseAdapter;
