// src/state/types.ts
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

// src/state/StateManager.ts
import { EventType, Event, eventHandler } from '../infrastructure/events/eventBusInstance';

export class StateManager {
    private state: SystemState;
    private listeners: Set<(state: SystemState) => void>;
    private static instance: StateManager;

    private constructor() {
        this.state = this.getInitialState();
        this.listeners = new Set();
        this.setupEventHandlers();
    }

    public static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    private getInitialState(): SystemState {
        return {
            auction: {
                currentAuctionId: null,
                status: 'idle',
                highestBid: 0,
                highestBidder: null,
                bidHistory: [],
                timeRemaining: 0,
                totalBids: 0
            },
            stream: {
                status: 'offline',
                viewerCount: 0,
                chatMessages: [],
                metrics: {
                    averageViewers: 0,
                    peakViewers: 0,
                    totalMessages: 0,
                    uptime: 0
                }
            },
            vtuber: {
                currentEmotion: 'neutral',
                lastEmotionChange: Date.now(),
                loadedAssets: [],
                currentAnimation: null,
                performance: {
                    fps: 60,
                    memoryUsage: 0,
                    loadTime: 0
                }
            },
            lastUpdate: Date.now()
        };
    }

    private setupEventHandlers(): void {
        // Auction Events
        eventHandler.on(EventType.AUCTION_STARTED, this.handleAuctionStart.bind(this));
        eventHandler.on(EventType.AUCTION_ENDED, this.handleAuctionEnd.bind(this));
        eventHandler.on(EventType.NEW_BID, this.handleNewBid.bind(this));
        eventHandler.on(EventType.BID_ACCEPTED, this.handleBidAccepted.bind(this));

        // Stream Events
        eventHandler.on(EventType.STREAM_STARTED, this.handleStreamStart.bind(this));
        eventHandler.on(EventType.STREAM_ENDED, this.handleStreamEnd.bind(this));
        eventHandler.on(EventType.VIEWER_JOINED, this.handleViewerJoined.bind(this));
        eventHandler.on(EventType.VIEWER_LEFT, this.handleViewerLeft.bind(this));
        eventHandler.on(EventType.CHAT_MESSAGE, this.handleChatMessage.bind(this));

        // VTuber Events
        eventHandler.on(EventType.EMOTION_CHANGE, this.handleEmotionChange.bind(this));
        eventHandler.on(EventType.ASSET_LOADED, this.handleAssetLoaded.bind(this));
        eventHandler.on(EventType.ANIMATION_STARTED, this.handleAnimationStarted.bind(this));
        eventHandler.on(EventType.ANIMATION_ENDED, this.handleAnimationEnded.bind(this));
    }

    private async handleAuctionStart(event: Event): Promise<void> {
        this.updateState({
            auction: {
                ...this.state.auction,
                currentAuctionId: event.data.auctionId,
                status: 'active',
                timeRemaining: event.data.duration,
                bidHistory: []
            }
        });
    }

    private async handleAuctionEnd(event: Event): Promise<void> {
        this.updateState({
            auction: {
                ...this.state.auction,
                status: 'ended',
                timeRemaining: 0
            }
        });
    }

    private async handleNewBid(event: Event): Promise<void> {
        const { amount, bidder, timestamp } = event.data;
        this.updateState({
            auction: {
                ...this.state.auction,
                totalBids: this.state.auction.totalBids + 1,
                bidHistory: [
                    ...this.state.auction.bidHistory,
                    { amount, bidder, timestamp }
                ]
            }
        });
    }

    private async handleBidAccepted(event: Event): Promise<void> {
        const { amount, bidder } = event.data;
        this.updateState({
            auction: {
                ...this.state.auction,
                highestBid: amount,
                highestBidder: bidder
            }
        });
    }

    private async handleStreamStart(event: Event): Promise<void> {
        this.updateState({
            stream: {
                ...this.state.stream,
                status: 'live',
                metrics: {
                    ...this.state.stream.metrics,
                    uptime: 0
                }
            }
        });
    }

    private async handleStreamEnd(event: Event): Promise<void> {
        this.updateState({
            stream: {
                ...this.state.stream,
                status: 'offline'
            }
        });
    }

    private async handleViewerJoined(event: Event): Promise<void> {
        const newCount = this.state.stream.viewerCount + 1;
        this.updateState({
            stream: {
                ...this.state.stream,
                viewerCount: newCount,
                metrics: {
                    ...this.state.stream.metrics,
                    peakViewers: Math.max(newCount, this.state.stream.metrics.peakViewers)
                }
            }
        });
    }

    private async handleViewerLeft(event: Event): Promise<void> {
        this.updateState({
            stream: {
                ...this.state.stream,
                viewerCount: Math.max(0, this.state.stream.viewerCount - 1)
            }
        });
    }

    private async handleChatMessage(event: Event): Promise<void> {
        const { id, sender, content, timestamp } = event.data;
        this.updateState({
            stream: {
                ...this.state.stream,
                chatMessages: [
                    ...this.state.stream.chatMessages,
                    { id, sender, content, timestamp }
                ].slice(-100), // Keep last 100 messages
                metrics: {
                    ...this.state.stream.metrics,
                    totalMessages: this.state.stream.metrics.totalMessages + 1
                }
            }
        });
    }

    private async handleEmotionChange(event: Event): Promise<void> {
        this.updateState({
            vtuber: {
                ...this.state.vtuber,
                currentEmotion: event.data.emotion,
                lastEmotionChange: Date.now()
            }
        });
    }

    private async handleAssetLoaded(event: Event): Promise<void> {
        this.updateState({
            vtuber: {
                ...this.state.vtuber,
                loadedAssets: [...this.state.vtuber.loadedAssets, event.data.assetId],
                performance: {
                    ...this.state.vtuber.performance,
                    loadTime: event.data.loadTime
                }
            }
        });
    }

    private async handleAnimationStarted(event: Event): Promise<void> {
        this.updateState({
            vtuber: {
                ...this.state.vtuber,
                currentAnimation: event.data.animationId,
                performance: {
                    ...this.state.vtuber.performance,
                    fps: event.data.fps
                }
            }
        });
    }

    private async handleAnimationEnded(event: Event): Promise<void> {
        this.updateState({
            vtuber: {
                ...this.state.vtuber,
                currentAnimation: null
            }
        });
    }

    private updateState(partialState: Partial<SystemState>): void {
        const newState = {
            ...this.state,
            ...partialState,
            lastUpdate: Date.now()
        };
        
        this.state = newState;
        this.notifyListeners();
        
        // Emit state changed event
        eventHandler.emit(
            EventType.STATE_CHANGED,
            { newState, timestamp: Date.now() },
            { source: 'StateManager' }
        );
    }

    public subscribe(listener: (state: SystemState) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.state));
    }

    public getState(): SystemState {
        return { ...this.state };
    }

    public reset(): void {
        this.state = this.getInitialState();
        this.notifyListeners();
    }
}

// Export singleton instance
export const stateManager = StateManager.getInstance();