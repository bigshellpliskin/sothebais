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
  width: number;
  height: number;
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

// New Generic Layer System
export interface GenericLayer {
  id: string;
  name: string;
  zIndex: number;
  visible: boolean;
  opacity: number;
  transform: Transform;
  content: {
    type: string;
    data: unknown;
  };
}

export interface ContentValidationError {
  field: string;
  message: string;
}

export interface ContentTypeHandler {
  validate: (data: unknown) => ContentValidationError[] | null;
  render: (data: unknown) => Promise<Buffer>;
}

export type ContentRegistry = Record<string, ContentTypeHandler>;

// New layer state interface
export interface NewLayerState {
  layers: GenericLayer[];
  version: string;
}

// Content type specific interfaces
export interface ImageContent {
  url: string;
  metadata?: Record<string, unknown>;
}

export interface VTuberContent {
  modelUrl: string;
  textureUrl?: string;
  animations: Record<string, string>;
  width: number;
  height: number;
}

export interface ChatContent {
  messages: {
    id: string;
    author: string;
    text: string;
    timestamp: number;
    highlighted: boolean;
  }[];
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
}

// Type guards for content validation
export const isImageContent = (data: unknown): data is ImageContent => {
  const img = data as ImageContent;
  return typeof img?.url === 'string';
};

export const isVTuberContent = (data: unknown): data is VTuberContent => {
  const vtuber = data as VTuberContent;
  return (
    typeof vtuber?.modelUrl === 'string' &&
    typeof vtuber?.width === 'number' &&
    typeof vtuber?.height === 'number' &&
    typeof vtuber?.animations === 'object'
  );
};

export const isChatContent = (data: unknown): data is ChatContent => {
  const chat = data as ChatContent;
  return Array.isArray(chat?.messages) && typeof chat?.maxMessages === 'number';
}; 