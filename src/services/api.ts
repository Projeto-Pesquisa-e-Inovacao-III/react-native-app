import axios from 'axios';

export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:8080/api';

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
