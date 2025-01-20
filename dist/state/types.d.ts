export interface AuctionState {
    currentAuctionId: string | null;
    status: 'idle' | 'active' | 'ended';
    highestBid: number;
    highestBidder: string | null;
    bidHistory: Array<{
        amount: number;
        bidder: string;
        timestamp: number;
    }>;
    timeRemaining: number;
    totalBids: number;
}
export interface StreamState {
    status: 'offline' | 'connecting' | 'live';
    viewerCount: number;
    chatMessages: Array<{
        id: string;
        sender: string;
        content: string;
        timestamp: number;
    }>;
    metrics: {
        averageViewers: number;
        peakViewers: number;
        totalMessages: number;
        uptime: number;
    };
}
export interface VTuberState {
    currentEmotion: string;
    lastEmotionChange: number;
    loadedAssets: string[];
    currentAnimation: string | null;
    performance: {
        fps: number;
        memoryUsage: number;
        loadTime: number;
    };
}
export interface SystemState {
    auction: AuctionState;
    stream: StreamState;
    vtuber: VTuberState;
    lastUpdate: number;
}
export declare class StateManager {
    private state;
    private listeners;
    private static instance;
    private constructor();
    static getInstance(): StateManager;
    private getInitialState;
    private setupEventHandlers;
    private handleAuctionStart;
    private handleAuctionEnd;
    private handleNewBid;
    private handleBidAccepted;
    private handleStreamStart;
    private handleStreamEnd;
    private handleViewerJoined;
    private handleViewerLeft;
    private handleChatMessage;
    private handleEmotionChange;
    private handleAssetLoaded;
    private handleAnimationStarted;
    private handleAnimationEnded;
    private updateState;
    subscribe(listener: (state: SystemState) => void): () => void;
    private notifyListeners;
    getState(): SystemState;
    reset(): void;
}
export declare const stateManager: StateManager;
