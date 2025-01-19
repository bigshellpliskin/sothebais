import { Plugin, Action, Evaluator, Provider, IAgentRuntime, Memory, State } from "@elizaos/core";

// Import managers
import { StreamManager } from "./managers/StreamManager";
import { AuctionManager } from "./managers/AuctionManager";
import { VTuberManager } from "./managers/VTuberManager";

// Import actions
import { newHighestBidAction } from "./actions/newHighestBid";
import { startAuctionAction } from "./actions/startAuction";
import { endAuctionAction } from "./actions/endAuction";

interface AuctionPlugin extends Plugin {
    streamManager: StreamManager | null;
    auctionManager: AuctionManager | null;
    vtuberManager: VTuberManager | null;
    initialize(runtime: IAgentRuntime): Promise<void>;
    cleanup(): Promise<void>;
}

export const auctionPlugin: AuctionPlugin = {
    name: "nft-auction-system",
    description: "NFT Auction System Plugin for automated Twitter livestream auctions",
    
    // Manager instances
    streamManager: null as StreamManager | null,
    auctionManager: null as AuctionManager | null,
    vtuberManager: null as VTuberManager | null,
    
    // Core plugin components
    actions: [
        newHighestBidAction,
        startAuctionAction,
        endAuctionAction
    ],
    evaluators: [],
    providers: [],

    // Initialize plugin managers
    async initialize(runtime: IAgentRuntime) {
        // Initialize managers
        this.streamManager = new StreamManager(runtime);
        this.auctionManager = new AuctionManager(runtime);
        this.vtuberManager = new VTuberManager(runtime);

        // Connect to Twitter stream
        await this.streamManager.initialize();
        
        // Initialize auction system
        await this.auctionManager.initialize();
        
        // Set up VTuber visualization
        await this.vtuberManager.initialize();
    },

    // Cleanup on shutdown
    async cleanup() {
        await this.streamManager?.cleanup();
        await this.auctionManager?.cleanup();
        await this.vtuberManager?.cleanup();
    }
};