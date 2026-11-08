import { Platform } from 'react-native';
import { getTelemetryMetadata, sanitizeTelemetryValue } from '../telemetryMetadata';

const mockDeviceState: { osVersion: string | null } = {
  osVersion: '14',
};

const mockAppState: {
  nativeApplicationVersion: string | null;
  nativeBuildVersion: string | null;
} = {
  nativeApplicationVersion: '1.2.0',
  nativeBuildVersion: '42',
};

const mockConstantsState: { expoConfig: { version?: string } | null } = {
  expoConfig: {
    version: '1.0.0',
  },
};

jest.mock('expo-device', () => ({
  get osVersion() {
    return mockDeviceState.osVersion;
  },
}));

jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    return mockAppState.nativeApplicationVersion;
  },
  get nativeBuildVersion() {
    return mockAppState.nativeBuildVersion;
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConstantsState.expoConfig;
    },
  },
}));

describe('telemetryMetadata', () => {
  const originalPlatformOS = Platform.OS;
  const originalPlatformVersion = Platform.Version;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatformOS,
      configurable: true,
    });
    Object.defineProperty(Platform, 'Version', {
      get: () => originalPlatformVersion,
      configurable: true,
    });
    mockDeviceState.osVersion = '14';
    mockAppState.nativeApplicationVersion = '1.2.0';
    mockAppState.nativeBuildVersion = '42';
    mockConstantsState.expoConfig = { version: '1.0.0' };
  });

  test('returns canonical headers on Android', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    mockDeviceState.osVersion = '14';
    mockAppState.nativeApplicationVersion = '1.2.0';
    mockAppState.nativeBuildVersion = '42';

    const headers = getTelemetryMetadata();

    expect(headers).toEqual({
      'X-OS': 'android',
      'X-OS-Version': '14',
      'X-App-Version': '1.2.0',
      'X-App-Build': '42',
    });
  });

  test('returns canonical headers on iOS', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    mockDeviceState.osVersion = '17.4';
    mockAppState.nativeApplicationVersion = '2.0.1';
    mockAppState.nativeBuildVersion = '99';

    const headers = getTelemetryMetadata();

    expect(headers).toEqual({
      'X-OS': 'ios',
      'X-OS-Version': '17.4',
      'X-App-Version': '2.0.1',
      'X-App-Build': '99',
    });
  });

  test('returns canonical headers on Web and falls back when native properties are null', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });
    Object.defineProperty(Platform, 'Version', { get: () => null, configurable: true });
    mockDeviceState.osVersion = null;
    mockAppState.nativeApplicationVersion = null;
    mockAppState.nativeBuildVersion = null;
    mockConstantsState.expoConfig = { version: '1.0.0' };

    const headers = getTelemetryMetadata();

    expect(headers).toEqual({
      'X-OS': 'web',
      'X-OS-Version': 'unknown',
      'X-App-Version': '1.0.0',
      'X-App-Build': '1',
    });
  });

  test('sanitizes unsafe characters and enforces max length of 32 chars', () => {
    expect(sanitizeTelemetryValue('14.0 (Beta 2)!')).toBe('14.0__Beta_2__');
    expect(sanitizeTelemetryValue('a'.repeat(50))).toBe('a'.repeat(32));
    expect(sanitizeTelemetryValue('   ', 'unknown')).toBe('unknown');
  });
});
