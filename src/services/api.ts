import axios from 'axios';

export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:8080/api';

const exceptions = ['/login', '/register', '/forgot-password', '/logout'];

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url: string = error.response.config?.url ?? '';
      const isException = exceptions.some((path) => url.includes(path));

      if (!isException) {
        // TODO: redirecionar para a tela de login via React Navigation
        // navigationRef.current?.navigate('Login');
      }
    }

    return Promise.reject(error);
  },
);
