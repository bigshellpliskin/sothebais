import express from 'express';
import { RedisService } from '../services/redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('state');
const redis = new RedisService();
export const stateRouter = express.Router();

// Get detailed state of a specific auction
stateRouter.get('/state/:marathonId/detailed', async (req, res) => {
  try {
    const { marathonId } = req.params;
    const [currentState, config, bids] = await Promise.all([
      redis.getCurrentAuction(marathonId),
      redis.getMarathonConfig(),
      redis.getAllBids(marathonId)
    ]);

    if (!currentState) {
      res.status(404).json({ status: 'error', message: 'Auction not found' });
      return;
    }

    // Calculate auction statistics
    const totalBids = Object.values(bids).reduce((acc, dayBids) => acc + dayBids.length, 0);
    const uniqueBidders = new Set(
      Object.values(bids)
        .flat()
        .map(bid => bid.userId)
    ).size;

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      auction: {
        ...currentState,
        config,
        statistics: {
          totalBids,
          uniqueBidders,
          currentDay: currentState.dayNumber,
          timeRemaining: currentState.endTime.getTime() - Date.now(),
          isActive: currentState.status === 'ACTIVE'
        }
      },
      bidHistory: {
        byDay: bids,
        lastBids: Object.values(bids)
          .flat()
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10)
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get detailed state:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get real-time metrics
stateRouter.get('/state/:marathonId/metrics', async (req, res) => {
  try {
    const { marathonId } = req.params;
    const currentState = await redis.getCurrentAuction(marathonId);

    if (!currentState) {
      res.status(404).json({ status: 'error', message: 'Auction not found' });
      return;
    }

    const redisHealth = await redis.checkHealth();
    const metrics = {
      status: 'success',
      timestamp: new Date().toISOString(),
      auctionMetrics: {
        status: currentState.status,
        currentBid: currentState.currentBid?.amount || 0,
        timeRemaining: currentState.endTime.getTime() - Date.now(),
        dayProgress: ((currentState.dayNumber - 1) / 30) * 100
      },
      systemMetrics: {
        redis: {
          status: redisHealth.status,
          memoryUsage: redisHealth.details.memoryUsage,
          connectedClients: redisHealth.details.info.connectedClients
        }
      }
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 