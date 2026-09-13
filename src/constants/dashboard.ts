import { api } from '../services/api';


export function getSalesQuantity() {
    return api.get(`/produtos-contratados/ganhos-mes/12`);
}

export function getPlansSalesQuantity() {
    return api.get(`/produtos-contratados/planos-vendidos/30`);
}

export function getConsultingSessions() {
    return api.get(`/agendamentos/consultoria-realizadas/12`);
}

export function getQuantityofActiveStudents() {
    return api.get(`/alunos/quantidade-ativos`);
}

export function getQuantityofInactiveStudents() {
    return api.get(`/produtos-contratados/quantidade-e-percentual-alunos-expirados`);
}