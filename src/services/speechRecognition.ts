import { Platform } from "react-native";
import type { ExpoSpeechRecognitionOptions } from "expo-speech-recognition";

type SpeechModuleType = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  abort: () => void;
  isRecognitionAvailable: () => boolean;
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

export const isSpeechRecognitionAvailable =
  Boolean(NativeModule) && (NativeModule?.isRecognitionAvailable() ?? false);

export const ExpoSpeechRecognitionModule: SpeechModuleType = NativeModule ?? {
  requestPermissionsAsync: async () => ({ granted: false }),
  start: () => {},
  stop: () => {},
  abort: () => {},
  isRecognitionAvailable: () => false,
};

export const useSpeechRecognitionEvent: (
  event: string,
  listener: (data: any) => void
) => void = nativeHook ?? ((_event: string, _listener: (data: any) => void) => {});
