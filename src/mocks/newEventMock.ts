export type MockPersonal = {
  id: number;
  nome: string;
  especialidade: string;
  caminhoFoto?: string;
};

export type MockSchedule = {
  startHour: string;
  endHour: string;
};

export type MockAppointment = {
  agendamentoId: number;
  agendamentoStatus: string;
  data: string;
  datafim: string;
  personalNome: string;
  alunoNome: string;
  tipoAula: string;
  endereco: {
    bairro: string;
    cidade: string;
  };
};

export type MockAddress = {
  id: number;
  label: string;
  postalCode: string;
  street: string;
  city: string;
  state: string;
  number: string;
  complement: string;
};

export const MOCK_PERSONALS: MockPersonal[] = [
  { id: 1, nome: "Ana Carolina", especialidade: "Treinamento funcional" },
  { id: 2, nome: "Bruno Martins", especialidade: "Musculação" },
  { id: 3, nome: "Camila Souza", especialidade: "Treino residencial" },
];

export const DEFAULT_PERSONAL = MOCK_PERSONALS[0];

export const MOCK_SCHEDULES: MockSchedule[] = [
  { startHour: "08:00", endHour: "09:00" },
  { startHour: "09:00", endHour: "10:00" },
  { startHour: "10:00", endHour: "11:00" },
  { startHour: "14:00", endHour: "15:00" },
  { startHour: "15:00", endHour: "16:00" },
  { startHour: "18:00", endHour: "19:00" },
  { startHour: "19:00", endHour: "20:00" },
];

export const MOCK_ADDRESSES: MockAddress[] = [
  {
    id: 1,
    label: "Casa",
    postalCode: "01310-100",
    street: "Avenida Paulista",
    city: "São Paulo",
    state: "SP",
    number: "1000",
    complement: "Apto 42",
  },
  {
    id: 2,
    label: "Apartamento",
    postalCode: "04538-132",
    street: "Rua Funchal",
    city: "São Paulo",
    state: "SP",
    number: "250",
    complement: "Bloco B",
  },
];

export const MOCK_APPOINTMENTS: MockAppointment[] = [
];
