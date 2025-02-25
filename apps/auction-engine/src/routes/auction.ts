import express from 'express';
import { AuctionManager } from '../services/auction-manager';
import { MarathonConfig, TwitterBid } from '../types/auction';

export const auctionRouter = express.Router();
const auctionManager = new AuctionManager();

// Start a new auction marathon
auctionRouter.post('/marathon/start', async (req, res) => {
  try {
    const config: MarathonConfig = req.body;
    const marathonId = await auctionManager.startAuctionMarathon(config);
    res.json({ 
      status: 'success', 
      message: 'Auction marathon started',
      marathonId 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ status: 'error', message });
  }
});

// Start daily auction
auctionRouter.post('/daily/start/:marathonId', async (req, res) => {
  try {
    const { marathonId } = req.params;
    await auctionManager.startDailyAuction(marathonId);
    res.json({ status: 'success', message: 'Daily auction started' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ status: 'error', message });
  }
});

// End daily auction
auctionRouter.post('/daily/end/:marathonId', async (req, res) => {
  try {
    const { marathonId } = req.params;
    await auctionManager.endDailyAuction(marathonId);
    res.json({ status: 'success', message: 'Daily auction ended' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ status: 'error', message });
  }
});

// Get current auction state
auctionRouter.get('/state/:marathonId', async (req, res) => {
  try {
    const { marathonId } = req.params;
    const state = await auctionManager.getCurrentAuction(marathonId);
    if (!state) {
      res.status(404).json({ status: 'error', message: 'No active auction found' });
      return;
    }
    res.json({ status: 'success', state });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ status: 'error', message });
  }
});

// Process a bid
auctionRouter.post('/bid/:marathonId', async (req, res) => {
  try {
    const { marathonId } = req.params;
    const bid: TwitterBid = req.body;
    const result = await auctionManager.processBid(marathonId, bid);
    res.json({ 
      status: result ? 'accepted' : 'rejected',
      message: result ? 'Bid was accepted as the new highest bid' : 'Bid was rejected',
      bid: {
        userId: bid.userId,
        amount: bid.amount,
        timestamp: bid.timestamp
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      status: 'error',
      message,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 