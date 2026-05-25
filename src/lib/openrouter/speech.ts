type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export interface SpeechListenOptions {
  lang?: string;
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

export function startSpeechListen(options: SpeechListenOptions): () => void {
  const Ctor = getSpeechRecognition();
  if (!Ctor) {
    options.onError?.('Voice input is not supported in this browser.');
    options.onEnd?.();
    return () => {};
  }

  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = options.lang ?? 'en-US';
  recognition.maxAlternatives = 1;

  let finalText = '';

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const part = event.results[i][0]?.transcript ?? '';
      if (event.results[i].isFinal) {
        finalText += part;
      } else {
        interim += part;
      }
    }
    const combined = (finalText + interim).trim();
    if (combined) options.onResult(combined);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error !== 'aborted') {
      options.onError?.(event.error === 'not-allowed' ? 'Microphone access denied' : event.error);
    }
  };

  recognition.onend = () => {
    options.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    options.onError?.('Could not start voice input');
    options.onEnd?.();
  }

  return () => {
    try {
      recognition.abort();
    } catch {
      /* ignore */
    }
  };
}
