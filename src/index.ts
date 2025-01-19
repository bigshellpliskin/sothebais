import { auctionPlugin } from './plugins/auctionSystem';

async function main() {
    console.log('Starting NFT Auction System...');
    console.log('Loaded plugin:', auctionPlugin.name);
}

main().catch(error => {
    console.error('Failed to start:', error);
    process.exit(1);
});