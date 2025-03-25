import express from 'express';
import { RedisService } from '../services/redis.js';
import { logger } from '@sothebais/packages/utils/logger';
import type { TwitterBid } from '@sothebais/packages/types/twitter';

const router = express.Router();
const redis = new RedisService();

interface BidsByDay {
  [day: string]: TwitterBid[];
}

router.get('/bids', async (req, res) => {
  try {
    // Get the current marathon ID or use a default one
    const marathonId = req.query['marathonId'] as string || 'current';
    const bidsData = await redis.getAllBids(marathonId);
    
    // Calculate total bids
    const totalBids = Object.values(bidsData).reduce((total, dayBids) => {
      return total + (Array.isArray(dayBids) ? dayBids.length : 0);
    }, 0);
    
    // Get unique bidders
    const allBids = Object.values(bidsData).flat();
    const uniqueBidders = [...new Set(allBids.map(bid => bid.userId))].length;
    
    // Get last 10 bids
    const lastBids = [...allBids]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
    
    res.json({
      totalBids,
      uniqueBidders,
      lastBids
    });
  } catch (error) {
    logger.error('Failed to get bid state', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to get bid state' });
  }
});

export default router; 