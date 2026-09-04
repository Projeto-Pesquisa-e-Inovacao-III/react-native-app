export type Schedule = {
  agendamentoId?: number;
  idAgendamento?: number;
  data: Date | string;
  descricao: string;
  novoEndereco: {
    numero: string;
    complemento: string;
    tipo: string;
    cep: {
      id: string;
      logradouro: string;
      bairro: string;
      localidade: string;
      uf: string;
    };
  };
  personalId: number;
  tipoAulaProdutoContratado: string;
};

export type ScheduleAfterInserted = {
  idAgendamento?: number;
  agendamentoId: number;
  aluno?: {
    nome?: string;
    idade?: number;
    avatarUrl?: string;
  };
  data: string;
  dataInicio: Date | string;
  dataFim: Date | string;
  descricao: string;
  tipoAula: string;
  status: string;
  endereco: {
    numero: string;
    complemento: string;
    unidade: string;
    tipo: string;
    cep: {
      id: string;
      logradouro: string;
      bairro: string;
      localidade: string;
      uf: string;
    };
  };
  personalId: number;
  tipoAulaProdutoContratado: string;
  analiseIa?: AnaliseIa;
};

export type AnaliseIa = {
  intro: string;
  tips: {
    title: string;
    text: string;
  }[];
};

export type CheckSchedule = {
  agendamentoId: number;
  status: string;
  dataFim: string;
  dataInicio: string;
  nome: string;
  idade: string;
  foto: string;
  endereco: {
    cep: {
      bairro: string;
      id: string;
      localidade: string;
      logradouro: string;
      uf: string;
    };
    numero: string;
  };
  telefone: {
    ddd: string;
    numero: string;
    pais: string;
  };
  tipoAula: string;
};

export type ScheduleReschedule = {
  idAgendamento?: number;
  data: string;
  descricao: string;
  endereco: null;
  personalId?: number;
  tipoAulaProdutoContratado?: string;
};

export type AbsenceAppointment = {
  idAgendamento: number;
  tipoUsuario: string;
  descricaoCancelamento?: string | null;
};

export type PaginatedResponse<T> = {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
};
