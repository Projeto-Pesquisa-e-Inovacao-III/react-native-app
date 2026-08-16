import { api } from '../services/api';
import type { AbsenceAppointment } from '../models/schedule';

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

export async function acceptUserAppointment(id: number) {
  return api.put(`/agendamentos/${id}/aprovar`);
}

export async function refuseAppointment(id: number) {
  return api.delete(`/agendamentos/${id}`);
}

export async function concludeAppointment(
  id: number,
  data: { resumo: string; grupoMuscular: string[] },
) {
  return api.put(`/agendamentos/${id}/confirmar-conclusao`, data);
}

export async function reportAbsencePersonal(data: AbsenceAppointment) {
  return api.put('/agendamentos/ausencia', data);
}

export async function findAppointmentById(id: number) {
  return api.get(`/agendamentos/${id}`);
}

export async function getScheduleData() {
  return api.get('/agendamentos/kpis');
}
