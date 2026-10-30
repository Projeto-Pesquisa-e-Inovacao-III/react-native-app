import type { ProductExhibition } from '../models/products';
import { api } from '../services/api';

export function getProductsExhibitions() {
  return api.get<ProductExhibition[]>('/produtos-exibicoes');
}

export function newProductExhibition(data: ProductExhibition) {
  return api.post<ProductExhibition>('/produtos-exibicoes', data);
}

export function desactivateProductExhibition(id: number) {
  return api.patch(`/produtos-exibicoes/desativar/${id}`);
}

export function updateProductExhibition(id: number | undefined, data: Partial<ProductExhibition>) {
  return api.post(`/produtos-exibicoes/editar/${id}`, data);
}

export function buyProductExhibition(id: number) {
  return api.post(`/comprar/${id}`);
}

export function actualPlan() {
  return api.get('/produtos-contratados/ativo');
}

export type UserPlanItem = {
  id: number;
  situacao?: boolean;
  dataCompra: string;
  dataExpiracao?: string;
  saldoAula?: number;
  produtoExibicao: {
    id?: number;
    titulo: string;
    subtitulo: string;
    descricao?: string;
    tipoAula?: string;
    preco?: number;
    tipoProduto?: string;
  };
};

export type BoughtPlanDetailsResponse = {
  id: number;
  nomeComprador: string;
  emailComprador: string;
  telefone: string;
  cpf: string;
  produtoComprado: string;
  valorCompra: number;
  dataCompra: string;
};

export function getUserPlansHistory(
  pageParam = 0,
  size = '10',
  initialDate?: string,
  finalDate?: string,
  name?: string,
) {
  return api.get<{ content: UserPlanItem[]; page?: any }>('/produtos-contratados', {
    params: {
      ...(initialDate && { dataInic: initialDate, dataInicio: initialDate }),
      ...(finalDate && { dataFim: finalDate }),
      ...(name && { nomeProduto: name }),
      page: pageParam,
      size,
    },
  });
}

export function BoughtPlanDetails(id: number) {
  return api.get<BoughtPlanDetailsResponse>(`/produtos-contratados/detalhado/${id}`);
}

export function verifyNumberOfPackages() {
  return api.get('/produtos-exibicoes/check-limit');
}

