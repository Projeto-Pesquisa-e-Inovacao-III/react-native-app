export type StatusProperty = {
  cardStatus: string;
  cardDescription: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
};

// Cores idênticas às classes Tailwind do web:
// bg-emerald-200 = #a7f3d0 | text-emerald-700 = #047857 | border-emerald-800 = #065f46
// bg-amber-300/30 ≈ #fef3c7 | text-amber-700 = #b45309 | border-amber-500 = #f59e0b
// bg-red-200 = #fecaca | text-red-900 = #7f1d1d | border-red-800 = #991b1b
// bg-gray-200 = #e5e7eb | text-gray-900 = #111827 | border-gray-800 = #1f2937

export const statusProperties: StatusProperty[] = [
  {
    cardStatus: 'CONCLUIDO',
    cardDescription: 'Agendamento concluído',
    backgroundColor: '#a7f3d0', // bg-emerald-200
    textColor: '#047857',        // text-emerald-700
    borderColor: '#065f46',      // border-emerald-800
  },
  {
    cardStatus: 'PENDENTE_PERSONAL_APROVACAO',
    cardDescription: 'Pendente resposta do personal',
    backgroundColor: '#fef3c7', // bg-amber-300/30
    textColor: '#b45309',        // text-amber-700
    borderColor: '#f59e0b',      // border-amber-500
  },
  {
    cardStatus: 'PENDENTE_CLIENTE_APROVACAO',
    cardDescription: 'Pendente resposta do aluno',
    backgroundColor: '#fef3c7',
    textColor: '#b45309',
    borderColor: '#f59e0b',
  },
  {
    cardStatus: 'APROVADO',
    cardDescription: 'Aprovado',
    backgroundColor: '#a7f3d0',
    textColor: '#047857',
    borderColor: '#065f46',
  },
  {
    cardStatus: 'PENDENTE_PERSONAL_CONCLUIR',
    cardDescription: 'Pendente (conclusão)',
    backgroundColor: '#a7f3d0',
    textColor: '#047857',
    borderColor: '#065f46',
  },
  {
    cardStatus: 'CANCELADO_PERSONAL',
    cardDescription: 'Cancelado pelo personal',
    backgroundColor: '#fecaca', // bg-red-200
    textColor: '#7f1d1d',        // text-red-900
    borderColor: '#991b1b',      // border-red-800
  },
  {
    cardStatus: 'CANCELADO_CLIENTE',
    cardDescription: 'Cancelado pelo cliente',
    backgroundColor: '#fecaca',
    textColor: '#7f1d1d',
    borderColor: '#991b1b',
  },
  {
    cardStatus: 'AUSENCIA_CLIENTE',
    cardDescription: 'Ausência (cliente)',
    backgroundColor: '#e5e7eb', // bg-gray-200
    textColor: '#111827',        // text-gray-900
    borderColor: '#1f2937',      // border-gray-800
  },
  {
    cardStatus: 'AUSENCIA_PERSONAL',
    cardDescription: 'Ausência (personal)',
    backgroundColor: '#e5e7eb',
    textColor: '#111827',
    borderColor: '#1f2937',
  },
];
