import { api } from '../services/api';

export function getUsers(page: number = 0, size: number = 10, nome?: string, email?: string, role?: string) {
  return api.get('/admin/usuarios', { params: { page, size, nome, email, role } });
}
