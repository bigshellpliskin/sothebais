import { layerManager } from '../services/layer-manager.js';
import type { VTuberCharacter, NFTContent, OverlayContent, ChatMessage } from '../types/layers.js';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get absolute paths for assets using ES modules compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsDir = join(__dirname, '../../assets');

// Sample VTuber character
const hostCharacter: VTuberCharacter = {
  modelUrl: 'assets/characters/auctioneer.png',
  textureUrl: null,  // No separate texture needed
  animations: {
    idle: 'idle-animation',
    talking: 'talking-animation'
  },
  width: 512,  // Default size for the character
  height: 512
};

// Sample NFT content
const nftContent: NFTContent = {
  imageUrl: 'assets/nfts/boy-with-apple.jpg',
  metadata: {
    name: 'Boy with Apple',
    collection: 'Grand Budapest Collection',
    creator: 'Johannes van Hoytl',
    price: '1.5 ETH'
  }
};

// Auction info overlay content
const auctionInfoContent: OverlayContent = {
  type: 'text',
  content: 'Current Bid: 1.5 ETH | Time Remaining: 10:00 | Highest Bidder: Collector123',
  style: {
    font: 'Arial',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    shadow: {
      color: 'rgba(0, 0, 0, 0.5)',
      blur: 4,
      offsetX: 2,
      offsetY: 2
    },
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 8
  }
};

// Sample chat messages
const chatMessages: ChatMessage[] = [
  {
    id: '1',
    author: 'User1',
    text: 'This NFT looks amazing! 🎨',
    timestamp: Date.now() - 5000,
    highlighted: false
  },
  {
    id: '2',
    author: 'Collector123',
    text: 'I bid 2 ETH! 💰',
    timestamp: Date.now() - 3000,
    highlighted: true
  },
  {
    id: '3',
    author: 'ArtLover',
    text: 'The detail in this piece is incredible',
    timestamp: Date.now() - 1000,
    highlighted: false
  }
];

export async function createTestLayers() {
  try {
    // Calculate dimensions
    const CANVAS_WIDTH = 1920;
    const CANVAS_HEIGHT = 1080;
    const RIGHT_PANEL_WIDTH = CANVAS_WIDTH * 0.3; // 30% of screen width
    const MAIN_PANEL_WIDTH = CANVAS_WIDTH - RIGHT_PANEL_WIDTH;
    const AUCTION_INFO_HEIGHT = 80;

    logger.info('Creating test layers with dimensions:', {
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      RIGHT_PANEL_WIDTH,
      MAIN_PANEL_WIDTH,
      AUCTION_INFO_HEIGHT
    });

    // Create NFT visual feed layer (main content)
    const nftLayer = await layerManager.createLayer('visualFeed', {
      content: nftContent
    }, {
      zIndex: 1,
      transform: {
        position: { x: 0, y: 0 },
        scale: { x: MAIN_PANEL_WIDTH / CANVAS_WIDTH, y: (CANVAS_HEIGHT - AUCTION_INFO_HEIGHT) / CANVAS_HEIGHT },
        rotation: 0,
        anchor: { x: 0, y: 0 }
      }
    });

    logger.info('Created NFT layer:', {
      id: nftLayer.id,
      type: nftLayer.type,
      transform: nftLayer.transform,
      content: nftLayer.content
    });

    // Create host layer (right side)
    const hostLayer = await layerManager.createLayer('host', {
      character: hostCharacter
    }, {
      zIndex: 2,
      transform: {
        position: { x: MAIN_PANEL_WIDTH, y: 0 },
        scale: { x: RIGHT_PANEL_WIDTH / CANVAS_WIDTH, y: 0.4 }, // Take up 40% of right panel height
        rotation: 0,
        anchor: { x: 0, y: 0 }
      }
    });

    logger.info('Created host layer:', {
      id: hostLayer.id,
      type: hostLayer.type,
      transform: hostLayer.transform,
      character: hostLayer.character
    });

    // Create chat layer (right side, below host)
    const chatLayer = await layerManager.createLayer('chat', {
      content: {
        messages: chatMessages,
        maxMessages: 50,
        style: {
          font: 'Arial',
          fontSize: 16,
          textColor: '#FFFFFF',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 12,
          messageSpacing: 8,
          fadeOutOpacity: 0.3
        }
      }
    }, {
      zIndex: 2,
      transform: {
        position: { x: MAIN_PANEL_WIDTH, y: CANVAS_HEIGHT * 0.4 }, // Start below host
        scale: { x: RIGHT_PANEL_WIDTH / CANVAS_WIDTH, y: 0.6 }, // Take remaining height
        rotation: 0,
        anchor: { x: 0, y: 0 }
      }
    });

    logger.info('Created chat layer:', {
      id: chatLayer.id,
      type: chatLayer.type,
      transform: chatLayer.transform,
      messages: chatLayer.content.messages.length
    });

    // Create auction info overlay (bottom of main content)
    const auctionInfoLayer = await layerManager.createLayer('overlay', {
      content: auctionInfoContent
    }, {
      zIndex: 3,
      transform: {
        position: { x: 0, y: CANVAS_HEIGHT - AUCTION_INFO_HEIGHT },
        scale: { x: MAIN_PANEL_WIDTH / CANVAS_WIDTH, y: AUCTION_INFO_HEIGHT / CANVAS_HEIGHT },
        rotation: 0,
        anchor: { x: 0, y: 0 }
      }
    });

    logger.info('Created auction info layer:', {
      id: auctionInfoLayer.id,
      type: auctionInfoLayer.type,
      transform: auctionInfoLayer.transform,
      content: auctionInfoLayer.content
    });

    // Verify all layers are created and visible
    const allLayers = [hostLayer, nftLayer, chatLayer, auctionInfoLayer];
    const layerStatus = allLayers.map(layer => ({
      id: layer.id,
      type: layer.type,
      visible: layer.visible,
      opacity: layer.opacity,
      zIndex: layer.zIndex
    }));

    logger.info('Layer creation complete. Layer status:', { layers: layerStatus });

    // Debug check for layer visibility
    const invisibleLayers = allLayers.filter(layer => !layer.visible || layer.opacity === 0);
    if (invisibleLayers.length > 0) {
      logger.warn('Some layers are invisible:', {
        layers: invisibleLayers.map(l => ({
          id: l.id,
          type: l.type,
          visible: l.visible,
          opacity: l.opacity
        }))
      });
    }

    return allLayers;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create test layers';
    logger.error('Failed to create test layers:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
} 