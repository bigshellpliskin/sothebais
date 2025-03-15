import { Counter, Gauge, Histogram } from 'prom-client';
import { metricsRegistry } from '../index.js';

// Auction State Metrics
export const activeAuctionsGauge = new Gauge({
  name: 'auction_active_auctions',
  help: 'Number of currently active auctions',
  registers: [metricsRegistry]
});

export const currentBidGauge = new Gauge({
  name: 'auction_current_bid_amount',
  help: 'Current highest bid amount in the active auction',
  labelNames: ['marathon_id', 'day_number'],
  registers: [metricsRegistry]
});

// Bid Metrics
export const bidCounter = new Counter({
  name: 'auction_bids_total',
  help: 'Total number of bids received',
  labelNames: ['status'], // 'accepted' or 'rejected'
  registers: [metricsRegistry]
});

export const bidProcessingDuration = new Histogram({
  name: 'auction_bid_processing_duration_seconds',
  help: 'Time taken to process bids',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

// Auction Lifecycle Metrics
export const auctionStateTransitions = new Counter({
  name: 'auction_state_transitions_total',
  help: 'Number of auction state transitions',
  labelNames: ['from_state', 'to_state'],
  registers: [metricsRegistry]
});

export const dailyAuctionDuration = new Gauge({
  name: 'auction_daily_duration_seconds',
  help: 'Duration of the current daily auction in seconds',
  labelNames: ['marathon_id', 'day_number'],
  registers: [metricsRegistry]
});

// Redis Metrics
export const redisOperationDuration = new Histogram({
  name: 'auction_redis_operation_duration_seconds',
  help: 'Duration of Redis operations',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [metricsRegistry]
});

export const redisConnectionStatus = new Gauge({
  name: 'auction_redis_connection_status',
  help: 'Status of Redis connection (1 for connected, 0 for disconnected)',
  registers: [metricsRegistry]
}); 