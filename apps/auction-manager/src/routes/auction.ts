import express from 'express';
import { AuctionManager } from '../services/auction-manager';
import { MarathonConfig, TwitterBid } from '../types/auction';

export const auctionRouter = express.Router();
const auctionManager = new AuctionManager();

// Start a new auction marathon
auctionRouter.post('/marathon/start', async (req, res) => {
  try {
    const config: MarathonConfig = req.body;
    await auctionManager.startAuctionMarathon(config);
    res.json({ status: 'success', message: 'Auction marathon started' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start daily auction
auctionRouter.post('/daily/start/:marathonId', async (req, res) => {
  try {
    const { marathonId } = req.params;
    await auctionManager.startDailyAuction(marathonId);
    res.json({ status: 'success', message: 'Daily auction started' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// End daily auction
auctionRouter.post('/daily/end/:marathonId', async (req, res) => {
  try {
    const { marathonId } = req.params;
    await auctionManager.endDailyAuction(marathonId);
    res.json({ status: 'success', message: 'Daily auction ended' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Process a bid
auctionRouter.post('/bid', async (req, res) => {
  try {
    const bid: TwitterBid = req.body;
    const result = await auctionManager.processBid(bid);
    res.json({ 
      status: 'success', 
      accepted: result,
      message: result ? 'Bid accepted' : 'Bid rejected'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}); 