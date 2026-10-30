import { format } from "date-fns";
import type { PersonalDTO } from "../models/personal";
import type { TimeSlot } from "../models/availability";
import { api } from "../services/api";
import { ptBR } from "date-fns/locale";

export function listStudents(page: number = 0, size: number = 10) {
    return api.get(`/alunos`, { params: { page, size } });
}

export function searchStudent(page: number = 0, size: number = 10, name: string) {
    return api.get(`/alunos`, { params: { page, size, nome: name } });
}

export function editPersonalProfile(data: PersonalDTO) {
    return api.put(`/personais/me`, data);
}

export function appoitmentsCount(payload?: { status: string; data?: string; }) {
    return api.post(`/agendamentos/contagem-status-data`, payload);
}

export function getPersonalHours(personalId: number, date: string, classType: string) {
    return api.get(`/personais/${personalId}/horarios-disponiveis`, { params: {data: date, tipoAula: classType} });
}

export function getPersonalById(personalId: string) {
    return api.get(`/personais/${personalId}`);
}

export function getAvailabilityHoursTomorrow(personalId: number) {
    const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd", { locale: ptBR });
    return api.get(`/personais/${personalId}/horarios-disponiveis`, { params: {data: tomorrow, tipoAula: "PRESENCIAL"} });
}

export async function getPersonalCronogram() {
    return await api.get(`/personais/me/cronograma`);
}

export function updatePersonalCronogram(data: TimeSlot, id: string) {
    return api.put(`/personais/horarios/${id}`, data);
}

export function updateBuffer(buffer: string) {
    return api.put(`personais/me/buffer`,  { bufferMinutos: buffer });
}

export function updateWorkDay(day: string) {
    return api.get(`personais/change-activation/${day}`);
}

export function verifySchedules(day: string, page: number = 0, size: number = 2) {
    return api.get(`agendamentos/dia-semana/${day}`, { params: { page, size } });
}

export function getPersonalBuffer() {
    return api.get(`personais/me/buffer`);
}

export function getScheduleData() {
    return api.get(`historico-agendamento/total-status`);
}
    