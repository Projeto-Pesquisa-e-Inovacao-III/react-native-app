import axios from 'axios';
import { api } from '../services/api';

export type UserAddress = {
  id: number;
  numero: string;
  complemento?: string;
  unidade?: string;
  tipo: string;
  cep: {
    id?: string;
    cep?: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  };
};

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
  return api.get<UserAddress[]>('/enderecos');
}

export async function createAddress(data: {
  numero: string;
  complemento?: string;
  tipo: string;
  cep: {
    id: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  };
}) {
  return api.post('/enderecos', data);
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
