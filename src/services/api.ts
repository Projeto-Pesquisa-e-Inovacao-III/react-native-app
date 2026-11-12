import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getTelemetryMetadata } from './telemetryMetadata';
import { logBufferService } from './logBufferService';

function resolveBackendHost() {
  const envHost = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_HOST : undefined;
  if (envHost && envHost.trim()) {
    const host = envHost.trim();
    console.log('[API] Using backend host from EXPO_PUBLIC_API_HOST:', host);
    return host;
  }

  if (Platform.OS === 'android') {
    console.log('[API] EXPO_PUBLIC_API_HOST not set on Android; using emulator fallback 10.0.2.2');
    return '10.0.2.2';
  }

  console.log('[API] Falling back to localhost backend host');
  return 'localhost';
}

export const BACKEND_HOST = resolveBackendHost();
export const BASE_URL = `http://${BACKEND_HOST}:8080/api`;
export const AUTH_TOKEN_KEY = 'auth_token';

console.log('[API] Platform:', Platform.OS);
console.log('[API] BACKEND_HOST:', BACKEND_HOST);
console.log('[API] BASE_URL:', BASE_URL);

const exceptions = ['/login', '/register', '/forgot-password', '/logout'];

export async function setAuthToken(token: string | null) {
  if (!token) {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function getAuthToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function clearAuthToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

const initialTelemetryHeaders = getTelemetryMetadata();

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 8000,
  headers: {
    ...initialTelemetryHeaders,
  },
});

Object.assign(api.defaults.headers.common, initialTelemetryHeaders);

api.interceptors.request.use(async (config) => {
  (config as any)._requestStartTime = Date.now();
  const telemetryHeaders = getTelemetryMetadata();

  if (config.headers) {
    config.headers['X-OS'] = telemetryHeaders['X-OS'];
    config.headers['X-OS-Version'] = telemetryHeaders['X-OS-Version'];
    config.headers['X-App-Version'] = telemetryHeaders['X-App-Version'];
    config.headers['X-App-Build'] = telemetryHeaders['X-App-Build'];
  }

  const token = await getAuthToken();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setOnUnauthorized(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function triggerUnauthorized() {
  unauthorizedHandler?.();
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error?.response?.status;
    if (!status || status >= 400) {
      void logBufferService.recordApiError(error);
    }

    if (error.response && error.response.status === 401) {
      const url: string = error.response.config?.url ?? '';
      const isException = exceptions.some((path) => url.includes(path));

      if (!isException) {
        triggerUnauthorized();
      }
    }

    return Promise.reject(error);
  },
);
