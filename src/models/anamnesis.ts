export type CondicaoDto = {
  situacao: string;
  tipo: 'PADRAO' | 'OUTRO';
};

export type AnamnesisData = {
  altura: number;
  peso: number;
  objectivoPrincipal: string;
  rotina: string | null;
  condicoes: CondicaoDto[];
  nivelDeAtividade: 'SEDENTARIO' | 'ATIVO' | 'MUITO_ATIVO';
  observacaoSaude: string | null;
};
