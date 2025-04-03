/**
 * Inter-Service Communication Framework Usage Example
 * 
 * This file demonstrates how to use the communication utilities in a service.
 */

import { 
  EventClient,
  validateEvent,
  eventValidationMiddleware,
  DeadLetterQueue,
  WebSocketClient,
  WebSocketState,
  HttpClient
} from '../index.js';
import { EVENT_SOURCES, EVENT_TYPES } from '../types/events.js';
import { createLogger } from '../utils/logger.js';

// Setup logger
const logger = createLogger('CommunicationExample');

/**
 * Setup for a typical auction service
 */
async function setupAuctionService() {
  // Create Event Client
  const eventClient = new EventClient({
    redisUrl: process.env['REDIS_URL'] || 'redis://localhost:6379',
    serviceName: 'AUCTION_ENGINE',
    eventHistoryMaxItems: 1000
  });

  // Create Dead Letter Queue
  const deadLetterQueue = new DeadLetterQueue(eventClient.getRedisClient());

  // Connect to Redis
  await eventClient.connect();
  logger.info('Event client connected');

  // Subscribe to relevant events
  await eventClient.subscribe('auction:start', async (event) => {
    // We need to assert the type for event.data to avoid TypeScript errors
    const auctionData = event.data as { auctionId: string };
    logger.info('Auction start event received', { auctionId: auctionData.auctionId });
    // Handle auction start logic
  });

  await eventClient.subscribe('lot:bid:placed', async (event) => {
    // Type assertion for bid data
    const bidData = event.data as { 
      bidId: string; 
      lotId: string;
      sessionId: string;
      userId: string;
      amount: string;
      currency: string;
    };
    
    logger.info('Bid placed event received', { 
      bidId: bidData.bidId, 
      amount: bidData.amount,
      currency: bidData.currency
    });
    
    try {
      // Process the bid
      const bidAccepted = await processBid(bidData);
      
      if (bidAccepted) {
        // Publish bid accepted event
        await eventClient.publish('BID_ACCEPTED', {
          bidId: bidData.bidId,
          lotId: bidData.lotId,
          sessionId: bidData.sessionId,
          userId: bidData.userId,
          amount: bidData.amount,
          currency: bidData.currency,
          timestamp: new Date().toISOString()
        });
      } else {
        // Publish bid rejected event
        await eventClient.publish('BID_REJECTED', {
          bidId: bidData.bidId,
          lotId: bidData.lotId,
          sessionId: bidData.sessionId,
          userId: bidData.userId,
          amount: bidData.amount,
          currency: bidData.currency,
          reason: 'Bid amount too low',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error processing bid', { error, bidId: bidData.bidId });
      
      // Store in dead letter queue for later retry
      await deadLetterQueue.storeFailedEvent(event, error as Error);
    }
  });
  
  // Return the client for use in other parts of the application
  return { eventClient, deadLetterQueue };
}

/**
 * Setup for a stream manager service with WebSocket
 */
async function setupStreamManagerService() {
  // Create Event Client
  const eventClient = new EventClient({
    redisUrl: process.env['REDIS_URL'] || 'redis://localhost:6379',
    serviceName: 'STREAM_MANAGER',
    eventHistoryMaxItems: 1000
  });

  // Connect to Redis
  await eventClient.connect();
  logger.info('Stream manager event client connected');

  // Create WebSocket client for preview feed
  const wsClient = new WebSocketClient({
    url: 'ws://rtmp-server:8080/ws',
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onOpen: (event, client) => {
      logger.info('WebSocket connection opened to RTMP server');
    },
    onMessage: (data, client) => {
      if (data.type === 'frame') {
        // Handle new video frame
        handleVideoFrame(data);
      } else if (data.type === 'stats') {
        // Handle stream statistics
        handleStreamStats(data);
        
        // Using type assertions for stream metrics events
        // Publish stream metrics event
        eventClient.publish('STREAM_METRICS_UPDATE', {
          streamId: data.streamId,
          // Using type assertion to satisfy TypeScript
          bitrate: data.bitrate,
          fps: data.fps,
          droppedFrames: data.droppedFrames,
          resolution: data.resolution,
          timestamp: new Date().toISOString()
        } as any).catch(error => {
          logger.error('Failed to publish stream metrics', { error });
        });
      }
    },
    onClose: (event, client) => {
      logger.warn('WebSocket connection closed', { 
        code: event.code, 
        reason: event.reason, 
        wasClean: event.wasClean 
      });
    },
    onError: (event, client) => {
      logger.error('WebSocket error');
    },
    onStateChange: (state, client) => {
      logger.info(`WebSocket state changed to ${state}`);
      
      // Publish state change event
      if (state === WebSocketState.CONNECTED) {
        eventClient.publish('STREAM_STATE_UPDATE', {
          streamId: 'stream-1',
          state: 'CONNECTED',
          timestamp: new Date().toISOString()
        } as any).catch(error => {
          logger.error('Failed to publish stream state update', { error });
        });
      } else if (state === WebSocketState.DISCONNECTED || state === WebSocketState.FAILED) {
        eventClient.publish('STREAM_STATE_UPDATE', {
          streamId: 'stream-1',
          state: 'DISCONNECTED',
          timestamp: new Date().toISOString()
        } as any).catch(error => {
          logger.error('Failed to publish stream state update', { error });
        });
      }
    }
  });

  // Connect to WebSocket server
  wsClient.connect();
  
  // Create HTTP client for API calls
  const httpClient = new HttpClient('http://api-server:3000');
  
  // Return the clients for use in other parts of the application
  return { eventClient, wsClient, httpClient };
}

/**
 * Setup Express middleware for event validation
 */
function setupExpressEventValidation(app: any) {
  // Apply event validation middleware to /events endpoint
  app.post('/events', eventValidationMiddleware(), async (req: any, res: any) => {
    // Process validated event
    const event = req.body;
    
    // ... handle the event
    
    res.status(200).json({ success: true });
  });
}

// Mock functions for the example
async function processBid(bidData: any): Promise<boolean> {
  // Actual implementation would check current price, validate bid, etc.
  return bidData.amount > 100;
}

function handleVideoFrame(data: any): void {
  // Process video frame data
}

function handleStreamStats(data: any): void {
  // Process stream statistics
}

// Don't run this code, it's just for demonstration
if (require.main === module) {
  logger.info('This is an example - not meant to be run directly');
  
  // If you do run it, add this to properly close connections
  let auctionService: Awaited<ReturnType<typeof setupAuctionService>> | undefined;
  let streamService: Awaited<ReturnType<typeof setupStreamManagerService>> | undefined;
  
  // Handle cleanup when exiting
  async function cleanup() {
    logger.info('Cleaning up connections before exit');
    
    // Close auction service connections if they exist
    if (auctionService) {
      await auctionService.eventClient.disconnect();
      logger.info('Auction service disconnected');
    }
    
    // Close stream service connections if they exist
    if (streamService) {
      await streamService.eventClient.disconnect();
      if (streamService.wsClient) {
        streamService.wsClient.close();
        logger.info('WebSocket connection closed');
      }
      logger.info('Stream service disconnected');
    }
    
    logger.info('All connections closed, exiting now');
    process.exit(0);
  }
  
  // Register process termination handlers
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  // Example of controlled execution for demonstration
  (async () => {
    try {
      logger.info('Starting demo execution with automatic termination');
      
      // Initialize services but with a timeout to prevent hanging
      const timeout = setTimeout(() => {
        logger.info('Demo execution timeout reached, cleaning up');
        cleanup();
      }, 5000); // Automatically terminate after 5 seconds
      
      // Run the example setup
      auctionService = await setupAuctionService();
      streamService = await setupStreamManagerService();
      
      logger.info('Services initialized successfully');
      
      // Clear timeout if you want to let the process run longer
      // clearTimeout(timeout);
    } catch (error) {
      logger.error('Error during example execution', { error });
      cleanup();
    }
  })();
} 