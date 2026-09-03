import axios from 'axios';
import Constants from 'expo-constants';

function getBaseUrl(): string {
  // Em produção, usa a variável de ambiente configurada
  if (!__DEV__) {
    return process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:8080/api';
  }

  // Em desenvolvimento, extrai o host do Metro bundler automaticamente.
  // Constants.expoConfig.hostUri tem o formato "192.168.x.x:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8080/api`;
  }

  // Fallback: .env ou localhost (útil ao rodar no browser via `w`)
  return process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:8080/api';
}

export const BASE_URL = getBaseUrl();

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
