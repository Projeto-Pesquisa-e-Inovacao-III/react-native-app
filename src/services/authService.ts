import { api } from './api';
import type { AuthResponseDTO } from '../models/user';

export async function isAuthenticated() {
  return await api.get<AuthResponseDTO>('/usuarios/auth');
}
