import { GoogleGenAI, Modality } from '@google/genai';

export type GeminiLiveCallbacks = {
  onStatus?: (status: 'connecting' | 'connected' | 'listening' | 'speaking' | 'closed') => void;
  onInputTranscript?: (text: string, isFinal: boolean) => void;
  onInputTurnComplete?: () => void;
  onOutputTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
};

const TARGET_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

function resampleTo16k(input: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === TARGET_SAMPLE_RATE) return input;
  const outputLength = Math.max(1, Math.round(input.length * TARGET_SAMPLE_RATE / sourceRate));
  const output = new Float32Array(outputLength);
  const ratio = sourceRate / TARGET_SAMPLE_RATE;
  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = i * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(input.length - 1, left + 1);
    const weight = sourceIndex - left;
    output[i] = (input[left] || 0) * (1 - weight) + (input[right] || 0) * weight;
  }
  return output;
}

function floatToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + size, bytes.length)));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export class GeminiLiveSpeakingSession {
  private session: any = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private gain: GainNode | null = null;
  private nextPlaybackTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private closed = false;
  private callbacks: GeminiLiveCallbacks;

  constructor(callbacks: GeminiLiveCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async connect(idToken: string, options: { persona: string; mode: string; level: string; track: string }) {
    this.closed = false;
    this.callbacks.onStatus?.('connecting');

    const tokenResponse = await fetch('/api/gemini/live-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(options),
    });
    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenPayload.success || !tokenPayload.token) {
      throw new Error(tokenPayload.error || 'Could not authenticate a Gemini Live session.');
    }

    this.audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    await this.audioContext.resume();
    const ai = new GoogleGenAI({ apiKey: tokenPayload.token });
    this.session = await ai.live.connect({
      model: tokenPayload.model || 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => this.callbacks.onStatus?.('connected'),
        onmessage: (message: any) => this.handleMessage(message),
        onerror: (event: any) => this.callbacks.onError?.(event?.message || 'Gemini Live connection error.'),
        onclose: (event: any) => {
          if (!this.closed) this.callbacks.onError?.(event?.reason || 'Gemini Live connection closed.');
          this.callbacks.onStatus?.('closed');
        },
      },
    });

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const context = this.audioContext;
    this.source = context.createMediaStreamSource(this.stream);
    this.processor = context.createScriptProcessor(512, 1, 1);
    this.gain = context.createGain();
    this.gain.gain.value = 0;
    this.processor.onaudioprocess = (event) => {
      if (this.closed || !this.session) return;
      const input = event.inputBuffer.getChannelData(0);
      const resampled = resampleTo16k(input, context.sampleRate);
      const pcm = floatToPcm16(resampled);
      this.session.sendRealtimeInput({
        audio: {
          data: toBase64(new Uint8Array(pcm.buffer)),
          mimeType: `audio/pcm;rate=${TARGET_SAMPLE_RATE}`,
        },
      });
    };
    this.source.connect(this.processor);
    this.processor.connect(this.gain);
    this.gain.connect(context.destination);
    this.callbacks.onStatus?.('listening');
  }

  private handleMessage(message: any) {
    const content = message?.serverContent;
    if (!content) return;

    if (content.interrupted) this.stopPlayback();

    if (content.inputTranscription?.text) {
      this.callbacks.onInputTranscript?.(content.inputTranscription.text, true);
    }
    if (content.interimInputTranscription?.text) {
      this.callbacks.onInputTranscript?.(content.interimInputTranscription.text, false);
    }
    if (content.outputTranscription?.text) {
      this.callbacks.onOutputTranscript?.(content.outputTranscription.text, false);
    }

    const parts = content.modelTurn?.parts || [];
    for (const part of parts) {
      const data = part?.inlineData?.data;
      if (typeof data === 'string') this.playAudio(data, part.inlineData.mimeType || '');
    }

    if (content.turnComplete) {
      this.callbacks.onInputTurnComplete?.();
      this.callbacks.onOutputTranscript?.('', true);
      this.callbacks.onStatus?.('listening');
    } else if (parts.length) {
      this.callbacks.onStatus?.('speaking');
    }
  }

  private playAudio(base64: string, mimeType: string) {
    const context = this.audioContext;
    if (!context) return;
    const sampleRate = Number(mimeType.match(/rate=(\d+)/)?.[1] || OUTPUT_SAMPLE_RATE);
    const bytes = fromBase64(base64);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const samples = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 1) samples[i] = pcm[i] / 32768;
    const buffer = context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => this.activeSources.delete(source);
    const startAt = Math.max(context.currentTime + 0.02, this.nextPlaybackTime);
    source.start(startAt);
    this.nextPlaybackTime = startAt + buffer.duration;
    this.activeSources.add(source);
  }

  private stopPlayback() {
    for (const source of this.activeSources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.activeSources.clear();
    this.nextPlaybackTime = this.audioContext?.currentTime || 0;
  }

  sendText(text: string) {
    if (!this.session || this.closed || !text.trim()) return;
    this.session.sendRealtimeInput({ text: text.trim() });
  }

  async close() {
    this.closed = true;
    this.stopPlayback();
    this.processor?.disconnect();
    this.source?.disconnect();
    this.gain?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.session?.close();
    this.session = null;
    this.processor = null;
    this.source = null;
    this.gain = null;
    this.stream = null;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.callbacks.onStatus?.('closed');
  }
}
