"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const redis_1 = require("redis");
const eventHandler_1 = require("./eventHandler");
const types_1 = require("./state/types");
const AuctionManager_1 = require("./plugins/auctionSystem/managers/AuctionManager");
const StreamManager_1 = require("./plugins/auctionSystem/managers/StreamManager");
const VTuberManager_1 = require("./plugins/auctionSystem/managers/VTuberManager");
const AgentRuntime_1 = require("./runtime/AgentRuntime");
class Application {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = process.env.PORT || 3000;
        this.redis = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://redis:6379'
        });
        this.setupExpress();
        this.setupManagers();
    }
    setupExpress() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: Date.now(),
                components: {
                    auction: this.auctionManager ? 'running' : 'stopped',
                    stream: this.streamManager ? 'running' : 'stopped',
                    vtuber: this.vtuberManager ? 'running' : 'stopped'
                },
                state: types_1.stateManager.getState()
            });
        });
        // State snapshot endpoint
        this.app.get('/state', (req, res) => {
            res.json(types_1.stateManager.getState());
        });
    }
    setupManagers() {
        // Initialize runtime
        this.runtime = new AgentRuntime_1.AgentRuntime(this.redis, eventHandler_1.eventHandler, types_1.stateManager);
        // Initialize managers with runtime
        this.auctionManager = new AuctionManager_1.AuctionManager(this.runtime);
        this.streamManager = new StreamManager_1.StreamManager(this.runtime);
        this.vtuberManager = new VTuberManager_1.VTuberManager(this.runtime);
    }
    async start() {
        try {
            // Connect to Redis
            await this.redis.connect();
            console.log('Connected to Redis');
            // Initialize runtime
            await this.runtime.initialize();
            // Initialize managers
            await this.auctionManager.initialize();
            await this.streamManager.initialize();
            await this.vtuberManager.initialize();
            // Start HTTP server
            this.app.listen(this.port, () => {
                console.log(`Server running on port ${this.port}`);
            });
            // Setup graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
        }
        catch (error) {
            console.error('Failed to start application:', error);
            throw error;
        }
    }
    async shutdown() {
        console.log('Shutting down...');
        try {
            // Cleanup managers
            await this.auctionManager.cleanup();
            await this.streamManager.cleanup();
            await this.vtuberManager.cleanup();
            // Cleanup runtime
            await this.runtime.cleanup();
            // Close Redis connection
            await this.redis.quit();
            console.log('Shutdown complete');
            process.exit(0);
        }
        catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}
// Start application
if (require.main === module) {
    const app = new Application();
    app.start().catch(error => {
        console.error('Application failed to start:', error);
        process.exit(1);
    });
}
