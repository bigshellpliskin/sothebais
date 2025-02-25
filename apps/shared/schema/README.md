# Schema Directory

This directory contains the database schema definitions for the SothebAIs project.

## Structure

- `prisma/` - PostgreSQL schema definition using Prisma
  - `schema.prisma` - Prisma schema file defining all database models

- `redis/` - Redis schema definitions
  - `keys.ts` - Key patterns and helper functions for Redis
  - `models.ts` - TypeScript interfaces for data stored in Redis

## Usage

### Prisma (PostgreSQL)

The Prisma schema defines the structure of the PostgreSQL database. To use it:

1. Install dependencies:
   ```bash
   npm install @prisma/client
   npm install prisma --save-dev
   ```

2. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

3. Use the Prisma client in your code:
   ```typescript
   import { PrismaClient } from '@prisma/client';

   const prisma = new PrismaClient();

   async function main() {
     const users = await prisma.user.findMany();
     console.log(users);
   }

   main()
     .catch(e => console.error(e))
     .finally(async () => await prisma.$disconnect());
   ```

### Redis

The Redis schema defines key patterns and data structures for Redis:

```typescript
import Redis from 'ioredis';
import { auctionKey } from '../shared/schema/redis/keys';
import { AuctionState } from '../shared/schema/redis/models';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Store auction state
async function saveAuctionState(auction: AuctionState) {
  await redis.set(
    auctionKey(auction.id),
    JSON.stringify(auction),
    'EX',
    86400 // 1 day TTL
  );
}

// Retrieve auction state
async function getAuctionState(auctionId: string): Promise<AuctionState | null> {
  const auctionStateJson = await redis.get(auctionKey(auctionId));
  if (!auctionStateJson) return null;
  return JSON.parse(auctionStateJson) as AuctionState;
}
```

## Important Note

This directory contains the actual database schema definitions, not just TypeScript types. For TypeScript type definitions used during development, see the `shared/types` directory. 