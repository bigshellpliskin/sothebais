import { layerManager } from '../services/layer-manager';
import { VTuberCharacter, NFTContent, OverlayContent, ChatMessage } from '../types/layers';
import { logger } from '../utils/logger';
import path from 'path';

// Get absolute paths for assets
const assetsDir = path.join(__dirname, '../../assets');

// Sample VTuber character
const hostCharacter: VTuberCharacter = {
  modelUrl: 'assets/characters/auctioneer.png',
  textureUrl: null,  // No separate texture needed
  animations: {
    idle: 'idle-animation',
    talking: 'talking-animation'
  }
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

// Sample overlay content
const overlayContent: OverlayContent = {
  type: 'shape',
  content: {
    type: 'rectangle',
    x: 50,
    y: 50,
    width: 200,
    height: 100
  },
  style: {
    fillColor: 'rgba(0, 123, 255, 0.5)',
    strokeColor: '#ffffff',
    strokeWidth: 2,
    cornerRadius: 10,
    gradient: {
      type: 'linear',
      colors: [
        { offset: 0, color: 'rgba(0, 123, 255, 0.2)' },
        { offset: 1, color: 'rgba(0, 123, 255, 0.8)' }
      ]
    }
  }
};

// Text overlay content
const textOverlayContent: OverlayContent = {
  type: 'text',
  content: 'Welcome to Stream Manager Demo!',
  style: {
    font: 'Arial',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    shadow: {
      color: 'rgba(0, 0, 0, 0.5)',
      blur: 4,
      offsetX: 2,
      offsetY: 2
    }
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
    // Create host layer
    const hostLayer = await layerManager.createLayer('host', {
      character: hostCharacter
    }, {
      zIndex: 0,
      transform: {
        position: { x: 300, y: 200 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 }
      }
    });

    // Create NFT visual feed layer
    const nftLayer = await layerManager.createLayer('visualFeed', {
      content: nftContent
    }, {
      zIndex: 1,
      transform: {
        position: { x: 600, y: 200 },
        scale: { x: 0.8, y: 0.8 },
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 }
      }
    });

    // Create shape overlay layer
    const shapeLayer = await layerManager.createLayer('overlay', {
      content: overlayContent
    }, {
      zIndex: 2,
      transform: {
        position: { x: 100, y: 100 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0, y: 0 }
      }
    });

    // Create text overlay layer
    const textLayer = await layerManager.createLayer('overlay', {
      content: textOverlayContent
    }, {
      zIndex: 3,
      transform: {
        position: { x: 450, y: 50 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 }
      }
    });

    // Create chat layer
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
      zIndex: 4,
      transform: {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0, y: 0 }
      }
    });

    logger.info('Created test layers successfully');
    return [hostLayer, nftLayer, shapeLayer, textLayer, chatLayer];
  } catch (error) {
    logger.error({ error }, 'Failed to create test layers');
    throw error;
  }
} 