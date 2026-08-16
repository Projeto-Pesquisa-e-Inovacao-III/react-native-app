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
