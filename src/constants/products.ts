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

export function getUserPlansHistory(
  pageParam = 0,
  size = '10',
  initialDate?: string,
  finalDate?: string,
  name?: string,
) {
  return api.get('/produtos-contratados', {
    params: {
      ...(initialDate && { dataInic: initialDate }),
      ...(finalDate && { dataFim: finalDate }),
      ...(name && { nomeProduto: name }),
      page: pageParam,
      size,
    },
  });
}

export function BoughtPlanDetails(id: number) {
  return api.get(`/produtos-contratados/detalhado/${id}`);
}

export function verifyNumberOfPackages() {
  return api.get('/produtos-exibicoes/check-limit');
}
