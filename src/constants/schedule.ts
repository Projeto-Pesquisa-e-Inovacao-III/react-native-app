import { api } from '../services/api';
import type {
  AbsenceAppointment,
  Schedule,
  ScheduleReschedule,
  CheckSchedule,
} from '../models/schedule';

export function insertAppointment(data: Schedule) {
  return api.post('/agendamentos', data);
}

export function rescheduleAppointment(data: ScheduleReschedule) {
  return api.put('/agendamentos/reagendar', data);
}

export function concludeAppointment(
  id: number,
  data: { resumo: string; grupoMuscular: string[] },
) {
  return api.put(`/agendamentos/${id}/confirmar-conclusao`, data);
}

export function refuseAppointment(id: number) {
  return api.delete(`/agendamentos/${id}`);
}

export async function acceptUserAppointment(id: number) {
  return await api.put(`/agendamentos/${id}/aprovar`);
}

export function reportAbsencePersonal(data: AbsenceAppointment) {
  return api.put('/agendamentos/ausencia', data);
}

export function getAppointmentByStatus({ data }: { data: { status: string; data: string } }) {
  return api.post('/agendamentos/contagem-status-data', data);
}

export function findUserAppointments() {
  return api.get('/agendamentos/me');
}

export async function findPersonalRequests(
  pageParam = 0,
  size = '10',
  initialDate?: string,
  finalDate?: string,
  status?: string,
  classType?: string,
  name?: string,
) {
  return api.get('/agendamentos/solicitacoes', {
    params: {
      ...(initialDate && { dataInic: initialDate }),
      ...(finalDate && { dataFim: finalDate }),
      ...(status && { status }),
      ...(classType && { tipoAgendamento: classType }),
      ...(name && { nome: name }),
      page: pageParam,
      size,
    },
  });
}

export function findUserRescheduleRequests() {
  return api.get('/agendamentos/solicitacoes');
}

export function appointmentAtCalendar() {
  return api.get('/agendamentos/calendario');
}

export function disabledPersonalDays(id: number) {
  return api.get(`/personais/dias-semana/${id}`);
}

export async function findAppointmentById(id: number) {
  return await api.get(`/agendamentos/${id}`);
}

export function getPersonalList() {
  return api.get('/personais');
}

export function getAppointmentResumes(alunoId: number, page = 0, size = 3) {
  return api.get(`/agendamentos/${alunoId}/resumos`, {
    params: { page, size },
  });
}

export async function getScheduleData() {
  return api.get('/agendamentos/kpis');
}
