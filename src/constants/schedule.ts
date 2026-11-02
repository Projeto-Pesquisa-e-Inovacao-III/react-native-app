import { api } from '../services/api';
import type {
  AbsenceAppointment,
  ExperimentalSchedule,
  ExtractedSchedule,
  Schedule,
  ScheduleReschedule,
  CheckSchedule,
} from '../models/schedule';
import { isAxiosError } from 'axios';

const AI_REQUEST_TIMEOUT = 60_000;

function isRecommendationNotFound(error: unknown) {
  if (!isAxiosError(error)) return false;

  const responseData: unknown = error.response?.data;
  const messages =
    typeof responseData === 'string'
      ? [responseData]
      : responseData && typeof responseData === 'object'
        ? Object.values(responseData).filter(
            (value): value is string => typeof value === 'string',
          )
        : [];

  return messages.some((message) =>
    message.toLowerCase().includes('não possui recomendacao de treino existente'),
  );
}

export function extractScheduleFromSpeech(textoAgendamento: string) {
  const endpoint = '/agendamentos/extrair';
  const payload = { textoAgendamento };
  const startedAt = Date.now();

  if (__DEV__) {
    console.info('[Agendamento IA] Requisição enviada', {
      method: 'POST',
      endpoint,
      payload,
    });
  }

  return api
    .post<ExtractedSchedule>(endpoint, payload, {
      timeout: AI_REQUEST_TIMEOUT,
    })
    .then((response) => {
      if (__DEV__) {
        console.info('[Agendamento IA] Resposta recebida', {
          endpoint,
          status: response.status,
          durationMs: Date.now() - startedAt,
          data: response.data,
        });
      }

      return response;
    })
    .catch((error: unknown) => {
      if (__DEV__) {
        if (isAxiosError(error)) {
          console.error('[Agendamento IA] Falha na requisição', {
            endpoint,
            status: error.response?.status ?? null,
            durationMs: Date.now() - startedAt,
            response: error.response?.data ?? null,
            message: error.message,
          });
        } else {
          console.error('[Agendamento IA] Falha na requisição', {
            endpoint,
            durationMs: Date.now() - startedAt,
            error,
          });
        }
      }

      throw error;
    });
}

export async function getOrCreateTrainingRecommendation(agendamentoId: number) {
  const path = `/agendamentos/${agendamentoId}/recomendacao-treino`;

  try {
    return await api.get<string>(path, { timeout: AI_REQUEST_TIMEOUT });
  } catch (error) {
    if (!isRecommendationNotFound(error)) throw error;
  }

  return api.post<string>(path, undefined, { timeout: AI_REQUEST_TIMEOUT });
}

export function insertAppointment(data: Schedule) {
  return api.post('/agendamentos', data);
}

export function insertExperimentalAppointment(data: ExperimentalSchedule) {
  return api.post('/agendamentos-experimentais', data);
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
  return api.get('/historico-agendamento/total-status');
}
