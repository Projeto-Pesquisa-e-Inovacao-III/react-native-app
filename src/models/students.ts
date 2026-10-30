export type StudentItem = {
  id: number;
  nome: string;
  idade: number;
  dataNascimento?: string;
  caminhoFoto?: string;
  ativo?: boolean;
  roles?: string[];
};

export type ListStudents = StudentItem[];
