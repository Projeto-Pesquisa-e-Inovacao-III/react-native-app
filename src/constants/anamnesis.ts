import type { AnamnesisData } from '../models/anamnesis';
import { api } from '../services/api';

export function createAnamnesis(data: AnamnesisData) {
  return api.post('/anamnese', data);
}

export function updateAnamnesis(data: AnamnesisData) {
  return api.put('/anamnese', data);
}

export function getAnamnesis() {
  return api.get<AnamnesisData>('/anamnese');
}

export function getAnamnesisById(id: string | number) {
  return api.get<AnamnesisData>(`/anamnese/aluno/${id}`);
}
