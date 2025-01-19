"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auctionPlugin = void 0;
// Import managers
const StreamManager_1 = require("./managers/StreamManager");
const AuctionManager_1 = require("./managers/AuctionManager");
const VTuberManager_1 = require("./managers/VTuberManager");
// Import actions
const newHighestBid_1 = require("./actions/newHighestBid");
const startAuction_1 = require("./actions/startAuction");
const endAuction_1 = require("./actions/endAuction");
exports.auctionPlugin = {
    name: "nft-auction-system",
    description: "NFT Auction System Plugin for automated Twitter livestream auctions",
    // Manager instances
    streamManager: null,
    auctionManager: null,
    vtuberManager: null,
    // Core plugin components
    actions: [
        newHighestBid_1.newHighestBidAction,
        startAuction_1.startAuctionAction,
        endAuction_1.endAuctionAction
    ],
    evaluators: [],
    providers: [],
    // Initialize plugin managers
    async initialize(runtime) {
        // Initialize managers
        this.streamManager = new StreamManager_1.StreamManager(runtime);
        this.auctionManager = new AuctionManager_1.AuctionManager(runtime);
        this.vtuberManager = new VTuberManager_1.VTuberManager(runtime);
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
