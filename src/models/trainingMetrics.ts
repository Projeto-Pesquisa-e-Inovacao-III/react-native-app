export type MuscleGroupKey =
  | 'PEITO'
  | 'COSTAS'
  | 'TRAPEZIO'
  | 'BICEPS'
  | 'TRICEPS'
  | 'ANTEBRACO'
  | 'OMBRO'
  | 'ABDOMEN'
  | 'QUADRICEPS'
  | 'POSTERIOR'
  | 'GLUTEO'
  | 'PANTURRILHA';

export type MuscleDistributionItem = {
  grupoMuscular: MuscleGroupKey;
  quantidade: number;
  percentual: number;
};

export type StudentTrainingMetrics = {
  alunoId: number;
  periodoDias: number;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
  totalTreinosConcluidos: number;
  frequenciaSemanal: number;
  maxTreinosGrupo: number;
  distribuicaoMuscular: MuscleDistributionItem[];
};

