import { SKRSContext2D } from '@napi-rs/canvas';
import { ChatLayer, ChatMessage } from '../types/layers';
import { logger } from '../utils/logger';

export class ChatRenderer {
  private static instance: ChatRenderer;
  private context: SKRSContext2D | null = null;
  private width: number = 1920;
  private height: number = 1080;

  private constructor() {}

  public static getInstance(): ChatRenderer {
    if (!ChatRenderer.instance) {
      ChatRenderer.instance = new ChatRenderer();
    }
    return ChatRenderer.instance;
  }

  public renderChat(
    ctx: SKRSContext2D,
    layer: ChatLayer,
    width: number,
    height: number
  ): void {
    try {
      this.context = ctx;
      this.width = width;
      this.height = height;

      const { messages, maxMessages, style } = layer.content;
      const { font, fontSize, textColor, backgroundColor, padding, messageSpacing, fadeOutOpacity } = style;

      // Calculate chat window dimensions (25% of screen width)
      const chatWidth = this.width * 0.25;
      const chatHeight = this.height;
      const chatX = 0; // Aligned to left edge

      // Draw chat background
      this.context.save();
      this.context.globalAlpha = layer.opacity;
      this.context.fillStyle = backgroundColor;
      this.context.fillRect(chatX, 0, chatWidth, chatHeight);

      // Set up text rendering
      this.context.font = `${fontSize}px ${font}`;
      this.context.fillStyle = textColor;
      this.context.textBaseline = 'top';

      // Calculate visible messages (newest first)
      const visibleMessages = messages
        .slice(-maxMessages)
        .reverse();

      // Calculate starting Y position for messages (from bottom)
      let currentY = chatHeight - padding;

      // Render messages from bottom to top
      for (const message of visibleMessages) {
        const messageHeight = this.calculateMessageHeight(message, chatWidth - padding * 2, fontSize);
        currentY -= messageHeight + messageSpacing;

        // Stop if we've reached the top of the chat window
        if (currentY < padding) break;

        this.renderMessage(
          message,
          chatX + padding,
          currentY,
          chatWidth - padding * 2,
          messageHeight,
          layer.opacity
        );
      }

      this.context.restore();
    } catch (error) {
      logger.error({ error, layer }, 'Error rendering chat layer');
    }
  }

  private calculateMessageHeight(message: ChatMessage, maxWidth: number, fontSize: number): number {
    if (!this.context) return fontSize;

    // Split message into lines based on available width
    const words = message.text.split(' ');
    let currentLine = '';
    let height = fontSize; // Minimum one line

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.context.measureText(testLine);

      if (metrics.width > maxWidth) {
        height += fontSize;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    return height;
  }

  private renderMessage(
    message: ChatMessage,
    x: number,
    y: number,
    maxWidth: number,
    height: number,
    layerOpacity: number
  ): void {
    if (!this.context) return;

    // Calculate message age and fade out if old
    const age = Date.now() - message.timestamp;
    const fadeOutStart = 30000; // Start fading after 30 seconds
    const fadeOutDuration = 5000; // Fade over 5 seconds
    let messageOpacity = 1;

    if (age > fadeOutStart) {
      messageOpacity = Math.max(0, 1 - (age - fadeOutStart) / fadeOutDuration);
    }

    this.context.save();
    this.context.globalAlpha = layerOpacity * messageOpacity;

    // Highlight background if message is highlighted
    if (message.highlighted) {
      this.context.fillStyle = 'rgba(255, 255, 0, 0.2)';
      this.context.fillRect(x - 4, y - 2, maxWidth + 8, height + 4);
    }

    // Draw author name
    this.context.fillStyle = '#FFD700'; // Gold color for author names
    this.context.fillText(message.author + ':', x, y);
    const authorWidth = this.context.measureText(message.author + ': ').width;

    // Draw message text with word wrap
    this.context.fillStyle = '#FFFFFF'; // White color for message text
    const words = message.text.split(' ');
    let line = '';
    let currentY = y;
    let currentX = x + authorWidth;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = this.context.measureText(testLine);

      if (metrics.width > maxWidth - authorWidth || currentX + metrics.width > x + maxWidth) {
        // Move to next line
        if (line) {
          this.context.fillText(line, currentX, currentY);
        }
        line = word;
        currentY += this.context.measureText('M').width * 1.2; // Approximate line height
        currentX = x; // Reset X to left margin
      } else {
        line = testLine;
      }
    }
    // Draw remaining text
    if (line) {
      this.context.fillText(line, currentX, currentY);
    }

    this.context.restore();
  }

  public clearContext(): void {
    this.context = null;
  }
}

export const chatRenderer = ChatRenderer.getInstance(); 