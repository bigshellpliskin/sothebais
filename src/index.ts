import express from 'express';
import { createClient, RedisClientType } from 'redis';
import { createEventBus } from './infrastructure/events/EventBusInstance';
import { stateManager } from './state/types';
import { AuctionManager } from './plugins/auctionSystem/managers/AuctionManager';
import { StreamManager } from './plugins/auctionSystem/managers/StreamManager';
import { VTuberManager } from './plugins/auctionSystem/managers/VTuberManager';
import { AgentRuntime } from './runtime/AgentRuntime';
import { EventBus } from './infrastructure/events/EventBus';

class Application {
    private app = express();
    private port = process.env.PORT || 3000;
    private redis: RedisClientType = createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379'
    });

    private runtime!: AgentRuntime;
    private eventBus!: EventBus;
    private auctionManager!: AuctionManager;
    private streamManager!: StreamManager;
    private vtuberManager!: VTuberManager;

    constructor() {
        this.setupExpress();
        this.setupManagers();
    }

    private setupExpress() {
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
                state: stateManager.getState()
            });
        });

        // State snapshot endpoint
        this.app.get('/state', (req, res) => {
            res.json(stateManager.getState());
        });
    }

    private setupManagers() {
        // Create runtime first
        this.runtime = new AgentRuntime(this.redis, null, stateManager);
        
        // Then create event bus with runtime
        this.eventBus = createEventBus(this.runtime);
        
        // Update runtime with event bus
        this.runtime.setEventHandler(this.eventBus);
        
        // Initialize managers with runtime
        this.auctionManager = new AuctionManager(this.runtime);
        this.streamManager = new StreamManager(this.runtime);
        this.vtuberManager = new VTuberManager(this.runtime);
    }

    public async start() {
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

        } catch (error) {
            console.error('Failed to start application:', error);
            throw error;
        }
    }

    private async shutdown() {
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
        } catch (error) {
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