import type { UpdateUserDTO, UserDTO } from '../models/user';
import { api } from '../services/api';
import { isAuthenticated as authServiceIsAuthenticated } from '../services/authService';

export const isAuthenticated = authServiceIsAuthenticated;

export function findByEmail(email: string) {
  return api.get(`/usuarios/email/${email}`);
}

export function findUserData() {
  return api.get('/usuarios/me');
}

export function getUserImage() {
  return api.get('/usuarios/me/imagem');
}

export function getUserImageByName(name: string) {
  return api.get(`/usuarios/foto/${name}`);
}

export function removerUserImage() {
  return api.delete('/usuarios/me/imagem');
}

export function insertUserImage(imageData: FormData) {
  return api.post('/usuarios/me/imagem', imageData);
}

export function update(userdata: UpdateUserDTO) {
  return api.put('/alunos/me/', userdata);
}

export function register(userdata: UserDTO) {
  return api.post('/alunos/cadastro', userdata);
}

export function login(email: string, password: string) {
  return api.post<{ mensagem?: string; user?: any }>('/usuarios/login', {
    email: email,
    senha: password,
  });
}

export async function getById(id: string) {
  return await api.get(`/alunos/${id}`);
}

export function softDelete() {
  return api.patch('/usuarios');
}

export function logout() {
  return api.get('/usuarios/logout');
}

export function sendResetCode(number: string) {
  return api.post('/api/password-reset/send-code', {
    pais: '55',
    ddd: number.slice(0, 2),
    numero: number.slice(2),
  });
}

export function verifyCode(number: string, code: string) {
  return api.post('/api/password-reset/verify-code', {
    pais: '55',
    ddd: number.slice(0, 2),
    numero: number.slice(2),
    verificationCode: code,
  });
}

export function changePassword(oldPassword: string, newPassword: string) {
  return api.patch('/usuarios/me/alterar-senha', {
    senhaAtual: oldPassword,
    senhaNova: newPassword,
  });
}

export function forgotPassword(number: string, newPassword: string, token: string) {
  return api.post('/api/password-reset/reset-password', {
    pais: '55',
    ddd: number.slice(0, 2),
    numero: number.slice(2),
    newPassword: newPassword,
    token: token,
  });
}
