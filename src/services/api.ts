import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveBackendHost() {
  const envHost = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_HOST : undefined;
  if (envHost && envHost.trim()) {
    const host = envHost.trim();
    console.log('[API] Using backend host from EXPO_PUBLIC_API_HOST:', host);
    return host;
  }

  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    console.log('[API] Using hostUri-derived backend host:', host);
    return host;
  }

  if (Platform.OS === 'android') {
    console.log('[API] Android without hostUri detected; using emulator fallback 10.0.2.2');
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

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 8000,
});

api.interceptors.request.use(async (config) => {
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