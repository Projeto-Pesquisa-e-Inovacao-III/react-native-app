import axios from 'axios';
import Constants from 'expo-constants';

function getApiBaseUrl() {
  // Production builds never have hostUri — don't let this silently
  // resolve to garbage in a shipped app. Point it at your real API.

  const debuggerHost =
    Constants.expoConfig?.hostUri ??       // modern SDKs
    Constants.expoGoConfig?.debuggerHost;  // Expo Go fallback

  const host = debuggerHost?.split(':')[0];

  if (!host) {
    console.warn('Could not detect Metro host — falling back to localhost');
    return 'http://localhost:8080/api';
  }

  return `http://${host}:8080/api`;
}

export const BASE_URL = getApiBaseUrl();
console.log('BASE_URL:', BASE_URL);

const exceptions = ['/login', '/register', '/forgot-password', '/logout'];

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setOnUnauthorized(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url: string = error.response.config?.url ?? '';
      const isException = exceptions.some((path) => url.includes(path));

      if (!isException) {
        unauthorizedHandler?.();
      }
    }

    return Promise.reject(error);
  },
);
