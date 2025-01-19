# NFT Auction System

An ElizaOS-powered NFT auction system with Twitter integration and VTuber visualization.

## Prerequisites

- Node.js 23+
- pnpm 9+
- Git

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy .env.example to .env and fill in your credentials

3. Start the system:
```bash
./start.sh
```

## Configuration

- Character configuration is in `characters/nft-auctioneer.character.json`
- Environment variables are in `.env`
- Stream settings can be adjusted in the character file

## Development

Set DEBUG=eliza:* for detailed logging:
```bash
DEBUG=eliza:* pnpm start
```
