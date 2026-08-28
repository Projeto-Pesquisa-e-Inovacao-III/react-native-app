export type SlotType = "DISPONIVEL" | "RESTRITO";
export type UserRole = "aluno" | "personal" | "admin";

export interface TimeSlot {
  id?: string;
  horaInicio: string;
  horaFim: string;
  diaSemana: string;
  tipo: SlotType;
  ativo?: boolean;
}

export interface DaySchedule {
  day: string;
  enabled: boolean;
  slots: TimeSlot[];
}

export interface SchedulesPageItem {
  id: string;
  alunoName: string;
  data: string;
  pathImage?: string;
}

export interface PaginationInfo {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}