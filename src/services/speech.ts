// Speech Recognition and Synthesis Engine for BenEnglish AI

export interface SpeechRecognitionResultState {
  transcript: string;
  isFinal: boolean;
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

  constructor(
    private onResult: (state: SpeechRecognitionResultState) => void,
    private onError: (errorMsg: string) => void,
    private onStateChange?: (active: boolean) => void
  ) {
    if (isSpeechRecognitionSupported()) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let highestConfidence = 0.9;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
            highestConfidence = item[0].confidence || 0.9;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const combined = (finalTranscript + ' ' + interimTranscript).trim();
        this.onResult({
          transcript: combined,
          isFinal: finalTranscript.length > 0,
          confidence: highestConfidence,
        });
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          this.onError('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error === 'no-speech') {
          // Normal timeout if user pauses, don't show scary error
        } else {
          this.onError(`Microphone issue: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange?.(false);
      };
    }
  }

  public start() {
    if (!this.recognition) {
      this.onError('Speech recognition is not supported in this browser. You can type your response instead.');
      return;
    }
    try {
      this.recognition.start();
      this.isListening = true;
      this.onStateChange?.(true);
    } catch (e: any) {
      console.warn('Start recognition error', e);
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignored
      }
      this.isListening = false;
      this.onStateChange?.(false);
    }
  }

  public get active(): boolean {
    return this.isListening;
  }
}
