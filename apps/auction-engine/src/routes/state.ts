import { Router } from 'express';
import { RedisService } from '../services/redis.js';
import { logger } from '@sothebais/shared/utils/logger.js';

const router = Router();
const redis = new RedisService();

// Define types for our data structures
interface Bid {
  userId: string;
  amount: number;
  timestamp: string;
}

interface BidsByDay {
  [day: string]: Bid[];
}

router.get('/bids', async (req, res) => {
  try {
    // Get the current marathon ID or use a default one
    const marathonId = req.query.marathonId as string || 'current';
    const bidsData = await redis.getAllBids(marathonId) as BidsByDay;
    
    // Calculate total bids
    const totalBids = Object.values(bidsData).reduce((total, dayBids) => {
      return total + (Array.isArray(dayBids) ? dayBids.length : 0);
    }, 0);
    
    // Get unique bidders
    const allBids = Object.values(bidsData).flat();
    const uniqueBidders = [...new Set(allBids.map(bid => bid.userId))].length;
    
    // Get last 10 bids
    const lastBids = [...allBids]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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