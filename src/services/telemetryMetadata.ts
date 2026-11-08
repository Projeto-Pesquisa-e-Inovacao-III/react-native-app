import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

export interface TelemetryHeaders {
  'X-OS': 'android' | 'ios' | 'web' | 'unknown';
  'X-OS-Version': string;
  'X-App-Version': string;
  'X-App-Build': string;
}

const MAX_HEADER_LENGTH = 32;
const SAFE_HEADER_REGEX = /^[a-zA-Z0-9._-]+$/;

export function sanitizeTelemetryValue(value: unknown, fallback = 'unknown'): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  const raw = String(value).trim();
  if (!raw) {
    return fallback;
  }
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, MAX_HEADER_LENGTH);
  if (!cleaned || !SAFE_HEADER_REGEX.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}

export function getTelemetryMetadata(): TelemetryHeaders {
  const os: TelemetryHeaders['X-OS'] =
    Platform.OS === 'android'
      ? 'android'
      : Platform.OS === 'ios'
        ? 'ios'
        : Platform.OS === 'web'
          ? 'web'
          : 'unknown';

  const rawOsVersion = Device.osVersion ?? (Platform.Version !== undefined && Platform.Version !== null ? String(Platform.Version) : 'unknown');
  const rawAppVersion = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const rawAppBuild = Application.nativeBuildVersion ?? '1';

  return {
    'X-OS': os,
    'X-OS-Version': sanitizeTelemetryValue(rawOsVersion, 'unknown'),
    'X-App-Version': sanitizeTelemetryValue(rawAppVersion, '1.0.0'),
    'X-App-Build': sanitizeTelemetryValue(rawAppBuild, '1'),
  };
}
