import { api } from '../services/api';
import type {
  ReqAdicionarRoleDTO,
  ReqCreateUserDTO,
  ResCadastrarPersonalDTO,
  ResNeedDataDTO,
} from '../models/admin';

export function getUsers(page: number = 0, size: number = 10, nome?: string, email?: string, role?: string) {
  return api.get('/admin/usuarios', { params: { page, size, nome, email, role } });
}

export function createPersonal(data: ReqCreateUserDTO) {
  return api.post<ResCadastrarPersonalDTO>('/admin/usuarios/personal', data);
}

export function deleteUser(id: number) {
  return api.patch(`/admin/usuarios/${id}/deletar`);
}

export function getVerifyNeedDataToAddRole(id: number, role: string): Promise<{ data: ResNeedDataDTO }> {
  return api.get(`/admin/usuarios/${id}/roles/perfil?role=${role}`);
}

export function addRoleToUser(id: number, role: string, extraData?: ReqAdicionarRoleDTO) {
  return api.put(`/admin/usuarios/${id}/roles?role=${role}`, extraData || {});
}

export function removeRoleFromUser(id: number, role: string) {
  return api.delete(`/admin/usuarios/${id}/roles?role=${role}`);
}

