import { api } from '../services/api';

export function getTotalByClassType() {
  return api
    .get('/produtos-contratados/total-tipo')
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error('Error fetching total by class type:', error);
      return 0;
    });
}

export function getTotalByClassTypeComplete(classType: string) {
  return api.get(`/produtos-contratados/total-tipo/${classType}`);
}
