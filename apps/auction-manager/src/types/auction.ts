export type AuctionStatus = 'PENDING' | 'ACTIVE' | 'PROCESSING' | 'COMPLETED';

export interface MarathonConfig {
  durationDays: number;
  dailyStartTime: string; // ISO time
  dailyEndTime: string;   // ISO time
  timezone: string;
}

export interface Bid {
  userId: string;
  tweetId: string;
  amount: number;
  timestamp: Date;
}

export interface AuctionState {
  marathonId: string;
  dayNumber: number;
  status: AuctionStatus;
  currentBid: Bid | null;
  startTime: Date;
  endTime: Date;
}

export interface TwitterBid {
  userId: string;
  tweetId: string;
  amount: number;
  timestamp: Date;
  rawContent: string;
} 