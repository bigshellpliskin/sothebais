export type Point2D = {
  x: number;
  y: number;
};

export type Transform = {
  position: Point2D;
  scale: Point2D;
  rotation: number;
  anchor: Point2D;
};

export type LayerType = 'host' | 'assistant' | 'visualFeed' | 'overlay' | 'chat';

export interface BaseLayer {
  id: string;
  type: LayerType;
  zIndex: number;
  visible: boolean;
  opacity: number;
  transform: Transform;
}

export interface VTuberCharacter {
  modelUrl: string;
  textureUrl: string | null;
  animations: Record<string, string>;
}

export interface NFTContent {
  imageUrl: string;
  metadata: Record<string, unknown>;
}

export interface OverlayContent {
  type: 'text' | 'image' | 'shape';
  content: string | Record<string, unknown>;
  style: Record<string, unknown>;
}

export interface HostLayer extends BaseLayer {
  type: 'host';
  character: VTuberCharacter;
}

export interface AssistantLayer extends BaseLayer {
  type: 'assistant';
  character: VTuberCharacter;
}

export interface VisualFeedLayer extends BaseLayer {
  type: 'visualFeed';
  content: NFTContent;
}

export interface OverlayLayer extends BaseLayer {
  type: 'overlay';
  content: OverlayContent;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  highlighted: boolean;
}

export interface ChatLayer extends BaseLayer {
  type: 'chat';
  content: {
    messages: ChatMessage[];
    maxMessages: number;
    style: {
      font: string;
      fontSize: number;
      textColor: string;
      backgroundColor: string;
      padding: number;
      messageSpacing: number;
      fadeOutOpacity: number;
    };
  };
}

export type Layer = HostLayer | AssistantLayer | VisualFeedLayer | OverlayLayer | ChatLayer;

export interface LayerState {
  layers: Layer[];
  activeLayerId: string | null;
} 