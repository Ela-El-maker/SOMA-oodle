
export class CameraService {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  async initialize(): Promise<void> {
    if (this.stream && this.video) return; // Already initialized

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.play();
      
      this.canvas = document.createElement('canvas');
    } catch (error) {
      console.error('[CameraService] Failed to initialize camera:', error);
      throw error;
    }
  }

  async captureSnapshot(): Promise<{ data: string, mimeType: string }> {
    if (!this.stream || !this.video || !this.canvas) {
      await this.initialize();
    }

    if (!this.video || !this.canvas) {
      throw new Error('Camera not initialized');
    }

    // Wait for video to be ready
    if (this.video.readyState < 2) {
      await new Promise(resolve => this.video!.onloadeddata = resolve);
    }

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    
    const dataUrl = this.canvas.toDataURL('image/jpeg');
    const base64Data = dataUrl.split(',')[1];
    
    return {
      data: base64Data,
      mimeType: 'image/jpeg'
    };
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.video = null;
    this.canvas = null;
  }
}

export const cameraService = new CameraService();
