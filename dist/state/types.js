"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateManager = exports.StateManager = void 0;
// src/state/StateManager.ts
const eventBusInstance_1 = require("../infrastructure/events/eventBusInstance");
class StateManager {
    constructor() {
        this.state = this.getInitialState();
        this.listeners = new Set();
        this.setupEventHandlers();
    }
    static getInstance() {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }
    getInitialState() {
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
    setupEventHandlers() {
        // Auction Events
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.AUCTION_STARTED, this.handleAuctionStart.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.AUCTION_ENDED, this.handleAuctionEnd.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.NEW_BID, this.handleNewBid.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.BID_ACCEPTED, this.handleBidAccepted.bind(this));
        // Stream Events
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.STREAM_STARTED, this.handleStreamStart.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.STREAM_ENDED, this.handleStreamEnd.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.VIEWER_JOINED, this.handleViewerJoined.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.VIEWER_LEFT, this.handleViewerLeft.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.CHAT_MESSAGE, this.handleChatMessage.bind(this));
        // VTuber Events
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.EMOTION_CHANGE, this.handleEmotionChange.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.ASSET_LOADED, this.handleAssetLoaded.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.ANIMATION_STARTED, this.handleAnimationStarted.bind(this));
        eventBusInstance_1.eventHandler.on(eventBusInstance_1.EventType.ANIMATION_ENDED, this.handleAnimationEnded.bind(this));
    }
    async handleAuctionStart(event) {
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
    async handleAuctionEnd(event) {
        this.updateState({
            auction: {
                ...this.state.auction,
                status: 'ended',
                timeRemaining: 0
            }
        });
    }
    async handleNewBid(event) {
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
    async handleBidAccepted(event) {
        const { amount, bidder } = event.data;
        this.updateState({
            auction: {
                ...this.state.auction,
                highestBid: amount,
                highestBidder: bidder
            }
        });
    }
    async handleStreamStart(event) {
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
    async handleStreamEnd(event) {
        this.updateState({
            stream: {
                ...this.state.stream,
                status: 'offline'
            }
        });
    }
    async handleViewerJoined(event) {
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
    async handleViewerLeft(event) {
        this.updateState({
            stream: {
                ...this.state.stream,
                viewerCount: Math.max(0, this.state.stream.viewerCount - 1)
            }
        });
    }
    async handleChatMessage(event) {
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
    async handleEmotionChange(event) {
        this.updateState({
            vtuber: {
                ...this.state.vtuber,
                currentEmotion: event.data.emotion,
                lastEmotionChange: Date.now()
            }
        });
    }
    async handleAssetLoaded(event) {
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
    async handleAnimationStarted(event) {
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
    async handleAnimationEnded(event) {
        this.updateState({
            vtuber: {
                ...this.state.vtuber,
                currentAnimation: null
            }
        });
    }
    updateState(partialState) {
        const newState = {
            ...this.state,
            ...partialState,
            lastUpdate: Date.now()
        };
        this.state = newState;
        this.notifyListeners();
        // Emit state changed event
        eventBusInstance_1.eventHandler.emit(eventBusInstance_1.EventType.STATE_CHANGED, { newState, timestamp: Date.now() }, { source: 'StateManager' });
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }
    getState() {
        return { ...this.state };
    }
    reset() {
        this.state = this.getInitialState();
        this.notifyListeners();
    }
}
exports.StateManager = StateManager;
// Export singleton instance
exports.stateManager = StateManager.getInstance();
