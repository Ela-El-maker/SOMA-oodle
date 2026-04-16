
class AudioProcessor extends AudioWorkletProcessor {
  // Buffer size in samples. 4096 is a common size.
  static BUFFER_SIZE = 4096;
  
  _buffer = new Float32Array(AudioProcessor.BUFFER_SIZE);
  _bufferIndex = 0;

  constructor() {
    super();
  }

  /**
   * Called by the browser's audio engine with new audio data.
   * @param {Float32Array[][]} inputs - An array of inputs, each with an array of channels.
   * @returns {boolean} - Return true to keep the processor alive.
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      
      // Buffer the incoming audio data. When the buffer is full, send it to the main thread.
      for (let i = 0; i < inputChannel.length; i++) {
        this._buffer[this._bufferIndex++] = inputChannel[i];
        
        if (this._bufferIndex === AudioProcessor.BUFFER_SIZE) {
          this.port.postMessage(this._buffer);
          this._bufferIndex = 0;
        }
      }
    }
    
    // Return true to indicate the processor is still active and should not be terminated.
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
