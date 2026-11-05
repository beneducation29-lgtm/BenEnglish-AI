// Speech Recognition and Synthesis Engine for BenEnglish AI

export interface SpeechRecognitionResultState {
  transcript: string;
  finalTranscript: string;
  interimTranscript: string;
  isFinal: boolean;
  /** Native browser confidence when supplied; 0 means the browser did not provide it. */
  confidence: number;
}

// Check speech recognition capability
export const isSpeechRecognitionSupported = (): boolean => {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
};

// Check speech synthesis capability
export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Speech Synthesis player
class BenEnglishAudioEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined') return;
    this.voices = window.speechSynthesis.getVoices();
    this.isLoaded = this.voices.length > 0;
  }

  public getEnglishVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices.filter((v) => v.lang.startsWith('en'));
  }

  private _volume: number = 1.0;
  private _isPaused: boolean = false;

  public setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.currentUtterance) {
      this.currentUtterance.volume = this._volume;
    }
  }

  public getVolume(): number {
    return this._volume;
  }

  public pause() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this._isPaused = true;
    }
  }

  public resume() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this._isPaused = false;
    }
  }

  public isPaused(): boolean {
    return this._isPaused;
  }

  public isSpeaking(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
      this._isPaused = false;
    }
  }

  public speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voiceName?: string;
      onBoundary?: (charIndex: number) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options?.onEnd?.();
      return;
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume !== undefined ? options.volume : this._volume;
    utterance.lang = 'en-US';

    const englishVoices = this.getEnglishVoices();
    if (options?.voiceName) {
      const selected = englishVoices.find((v) => v.name.includes(options.voiceName!));
      if (selected) utterance.voice = selected;
    } else if (englishVoices.length > 0) {
      // Prefer standard clear English voice
      const preferred = englishVoices.find((v) =>
        v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')
      ) || englishVoices[0];
      utterance.voice = preferred;
    }

    if (options?.onBoundary) {
      utterance.onboundary = (event) => {
        options.onBoundary!(event.charIndex);
      };
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      this._isPaused = false;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      this._isPaused = false;
      options?.onError?.(e);
    };

    this.currentUtterance = utterance;
    this._isPaused = false;
    window.speechSynthesis.speak(utterance);
  }
}

export const audioEngine = new BenEnglishAudioEngine();

// Speech Recognition helper
export class SpeechRecognitionSession {
  private recognition: any = null;
  private isListening = false;
  private finalTranscript = '';
  private interimTranscript = '';
  private stopCallback: ((transcript: string) => void) | null = null;

  constructor(
    private onResult: (state: SpeechRecognitionResultState) => void,
    private onError: (errorMsg: string) => void,
    private onStateChange?: (active: boolean) => void,
    private onStopped?: (transcript: string) => void
  ) {
    if (isSpeechRecognitionSupported()) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const finalParts: string[] = [];
        const interimParts: string[] = [];
        const confidenceValues: number[] = [];

        // Rebuild from the complete result list. Browsers retain earlier final
        // results in this list; reading only resultIndex can drop prior phrases.
        for (let i = 0; i < event.results.length; i += 1) {
          const item = event.results[i];
          const alternative = item?.[0];
          const transcript = String(alternative?.transcript || '').trim();
          if (!transcript) continue;

          if (item.isFinal) {
            finalParts.push(transcript);
            if (typeof alternative.confidence === 'number' && alternative.confidence > 0) {
              confidenceValues.push(alternative.confidence);
            }
          } else {
            interimParts.push(transcript);
          }
        }

        this.finalTranscript = finalParts.join(' ').replace(/\\s+([,.;!?])/g, '$1').trim();
        this.interimTranscript = interimParts.join(' ').trim();
        const transcript = [this.finalTranscript, this.interimTranscript].filter(Boolean).join(' ').trim();

        this.onResult({
          transcript,
          finalTranscript: this.finalTranscript,
          interimTranscript: this.interimTranscript,
          isFinal: finalParts.length > 0,
          confidence: confidenceValues.length
            ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
            : 0,
        });
      };

      this.recognition.onerror = (event: any) => {
        const error = String(event?.error || 'unknown');
        console.warn('Speech recognition warning:', error);
        const messages: Record<string, string> = {
          'not-allowed': 'Microphone access was denied. Allow microphone access in your browser settings, then try again.',
          'service-not-allowed': 'The browser blocked its speech recognition service. Check browser permissions or try another supported browser.',
          'audio-capture': 'No microphone was found. Connect or select a working microphone and try again.',
          network: 'Speech recognition could not reach the browser speech service. Check your connection and try again.',
          aborted: 'Speech recognition was interrupted. You can start a new recording.',
          'language-not-supported': 'English speech recognition is not available in this browser configuration.',
          'no-speech': 'No speech was detected. Move closer to the microphone and try again.',
        };
        this.onError(messages[error] || `Microphone or speech recognition issue: ${error}.`);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange?.(false);
        const transcript = this.transcript;
        this.onStopped?.(transcript);
        const callback = this.stopCallback;
        this.stopCallback = null;
        callback?.(transcript);
      };
    }
  }

  public start() {
    if (!this.recognition) {
      this.onError('Speech recognition is not supported in this browser. You can type your response instead.');
      return;
    }
    if (this.isListening) return;

    this.finalTranscript = '';
    this.interimTranscript = '';
    this.stopCallback = null;
    try {
      this.recognition.start();
      this.isListening = true;
      this.onStateChange?.(true);
    } catch (error: any) {
      const message = error?.name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow microphone access in your browser settings.'
        : error?.name === 'InvalidStateError'
          ? 'Speech recognition is already starting. Please wait a moment and try again.'
          : 'Could not start speech recognition. Please check your microphone and try again.';
      this.onError(message);
    }
  }

  public stop(onStopped?: (transcript: string) => void) {
    if (onStopped) this.stopCallback = onStopped;
    if (!this.recognition || !this.isListening) {
      const callback = this.stopCallback;
      this.stopCallback = null;
      callback?.(this.transcript);
      return;
    }
    try {
      // The final result can arrive after stop() is called. Wait for onend
      // before handing the complete transcript back to the caller.
      this.recognition.stop();
    } catch {
      const callback = this.stopCallback;
      this.stopCallback = null;
      callback?.(this.transcript);
    }
  }

  public get transcript(): string {
    return [this.finalTranscript, this.interimTranscript].filter(Boolean).join(' ').trim();
  }

  public get active(): boolean {
    return this.isListening;
  }
}
