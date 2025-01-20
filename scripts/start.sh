#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Warning: .env file not found, using default configuration"
    source .env.default
fi

# Ensure the dist directory exists (compiled TypeScript)
if [ ! -d "dist" ]; then
    echo "Building project..."
    pnpm build
fi

# Start the application with the NFT Auctioneer character
pnpm start --character=characters/nft-auctioneer.character.json
