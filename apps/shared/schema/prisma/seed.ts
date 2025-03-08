const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create test admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sothebais.com' },
    update: {},
    create: {
      email: 'admin@sothebais.com',
      name: 'Admin User',
      isAdmin: true,
      preferences: {
        create: {
          notificationsEnabled: true,
          bidConfirmations: true,
          outbidAlerts: true,
          auctionReminders: true,
          theme: 'system',
        },
      },
    },
  });

  // Create test collection
  const collection = await prisma.collection.upsert({
    where: { name: 'Test Collection' },
    update: {},
    create: {
      name: 'Test Collection',
      description: 'A test NFT collection',
      projectName: 'Test Project',
      blockchain: 'ethereum',
      artItems: {
        create: [
          {
            name: 'Test NFT #1',
            description: 'First test NFT',
            imageUrl: 'https://placeholder.co/400',
            metadata: {},
          },
          {
            name: 'Test NFT #2',
            description: 'Second test NFT',
            imageUrl: 'https://placeholder.co/400',
            metadata: {},
          },
        ],
      },
    },
  });

  // Create test campaign
  const now = new Date();
  const campaign = await prisma.campaign.upsert({
    where: { name: 'Test Campaign' },
    update: {},
    create: {
      name: 'Test Campaign',
      description: 'A test auction campaign',
      startDate: now,
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'DRAFT',
      collectionId: collection.id,
    },
  });

  // Create test auction session
  const auctionSession = await prisma.auctionSession.create({
    data: {
      sessionDate: now,
      preAuctionStartTime: now,
      preAuctionEndTime: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes
      auctionStartTime: new Date(now.getTime() + 30 * 60 * 1000),
      auctionEndTime: new Date(now.getTime() + 90 * 60 * 1000), // 1 hour auction
      postAuctionStartTime: new Date(now.getTime() + 90 * 60 * 1000),
      postAuctionEndTime: new Date(now.getTime() + 120 * 60 * 1000), // 30 minutes post
      status: 'SCHEDULED',
      campaignId: campaign.id,
    },
  });

  // Create test character
  const character = await prisma.character.create({
    data: {
      name: 'Auctioneer Alice',
      description: 'A friendly AI auctioneer',
      personality: 'Enthusiastic and professional',
      defaultExpression: 'neutral',
      expressions: ['neutral', 'happy', 'excited', 'thoughtful'],
      backgrounds: ['auction_hall', 'gallery'],
      memory: {
        traits: ['professional', 'friendly', 'knowledgeable'],
        interests: ['art', 'technology', 'auctions'],
      },
    },
  });

  // Create test stream assets
  const streamAssets = await prisma.streamAsset.createMany({
    data: [
      {
        name: 'Default Background',
        type: 'BACKGROUND',
        path: '/assets/backgrounds/default.png',
        metadata: { theme: 'light' },
      },
      {
        name: 'Auction Overlay',
        type: 'OVERLAY',
        path: '/assets/overlays/auction.png',
        metadata: { position: 'top-right' },
      },
    ],
  });

  console.log('Database seeded with test data:', {
    adminUser,
    collection,
    campaign,
    auctionSession,
    character,
    streamAssets,
  });
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 