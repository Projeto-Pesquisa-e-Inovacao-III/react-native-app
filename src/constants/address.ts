import axios from 'axios';
import { api } from '../services/api';
import type { Address } from '../models/address';

export type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function getUserAddresses() {
  return api.get<Address[]>('/enderecos');
}

export async function createAddress(data: Address) {
  return api.post('/enderecos', data);
}

export async function updateUserAddress(id: number, data: Address) {
  return api.put(`/enderecos/${id}`, data);
}

export async function deleteUserAddress(id: number) {
  return api.delete(`/enderecos/${id}`);
}

export async function lookupCep(cleanCep: string): Promise<ViaCepResponse | null> {
  const digitsOnly = cleanCep.replace(/\D/g, '');
  if (digitsOnly.length !== 8) return null;

  try {
    const response = await axios.get<ViaCepResponse>(
      `https://viacep.com.br/ws/${digitsOnly}/json/`,
    );
    if (response.data && !response.data.erro) {
      return response.data;
    }
    return null;
  } catch {
    return null;
  }
}