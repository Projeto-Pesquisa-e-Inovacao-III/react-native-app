type SpeechModuleType = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: any) => void;
  stop: () => void;
  abort: () => void;
};

let NativeModule: SpeechModuleType | null = null;
let nativeHook: ((event: string, listener: (data: any) => void) => void) | null = null;

try {
  const pkg = require("expo-speech-recognition");
  NativeModule = pkg.ExpoSpeechRecognitionModule;
  nativeHook = pkg.useSpeechRecognitionEvent;
} catch {
  NativeModule = null;
  nativeHook = null;
}

export const isSpeechRecognitionAvailable = Boolean(NativeModule);

export const ExpoSpeechRecognitionModule: SpeechModuleType = NativeModule ?? {
  requestPermissionsAsync: async () => ({ granted: false }),
  start: () => {},
  stop: () => {},
  abort: () => {},
};

export const useSpeechRecognitionEvent: (
  event: string,
  listener: (data: any) => void
) => void = nativeHook ?? ((_event: string, _listener: (data: any) => void) => {});
