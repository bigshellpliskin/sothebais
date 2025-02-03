export class FFmpegService {
  constructor(private config: { framerate: number }) {}

  private buildFFmpegArgs(): string[] {
    const args = [
      // Input options
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', this.config.framerate.toString(),
      '-i', 'pipe:0',
    ];

    // Add hardware acceleration if available
    // ... existing code ...
    return args;
  }
}