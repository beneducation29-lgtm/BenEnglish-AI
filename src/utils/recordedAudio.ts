/**
 * Convert a short browser recording to mono 16 kHz PCM WAV for Gemini audio input.
 * Raw audio is sent only with the assessment request; it is not persisted in local storage.
 */
export async function recordedBlobToWavBase64(blob: Blob): Promise<string> {
  if (!blob || blob.size === 0) throw new Error('Bản ghi âm trống. Hãy ghi âm lại trước khi chấm phát âm.');
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) throw new Error('Trình duyệt không hỗ trợ xử lý âm thanh để chấm phát âm.');
  const context: AudioContext = new AudioContextCtor();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const sourceRate = decoded.sampleRate;
    const targetRate = 16000;
    const outputLength = Math.max(1, Math.floor(decoded.duration * targetRate));
    const mono = new Float32Array(outputLength);
    const channelCount = decoded.numberOfChannels;
    for (let i = 0; i < outputLength; i += 1) {
      const sourcePosition = i * sourceRate / targetRate;
      const left = Math.floor(sourcePosition);
      const fraction = sourcePosition - left;
      let sample = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        const data = decoded.getChannelData(channel);
        const a = data[Math.min(left, data.length - 1)] || 0;
        const b = data[Math.min(left + 1, data.length - 1)] || 0;
        sample += a + (b - a) * fraction;
      }
      mono[i] = sample / channelCount;
    }
    const bytes = new ArrayBuffer(44 + outputLength * 2);
    const view = new DataView(bytes);
    const writeText = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
    };
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + outputLength * 2, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, targetRate, true);
    view.setUint32(28, targetRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, outputLength * 2, true);
    for (let i = 0; i < outputLength; i += 1) {
      const sample = Math.max(-1, Math.min(1, mono[i]));
      view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    const data = new Uint8Array(bytes);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < data.length; offset += chunkSize) {
      binary += String.fromCharCode(...data.subarray(offset, Math.min(offset + chunkSize, data.length)));
    }
    return btoa(binary);
  } finally {
    await context.close().catch(() => undefined);
  }
}
