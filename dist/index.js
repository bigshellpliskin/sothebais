"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auctionSystem_1 = require("./plugins/auctionSystem");
async function main() {
    console.log('Starting NFT Auction System...');
    console.log('Loaded plugin:', auctionSystem_1.auctionPlugin.name);
}
main().catch(error => {
    console.error('Failed to start:', error);
    process.exit(1);
});
