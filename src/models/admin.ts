export type ReqAdicionarRoleDTO = {
  cpf: string | null;
  cref: string | null;
};

export type ResNeedDataDTO = {
  needData: boolean;
  needFields?: Record<string, string>;
};

export type ResUsuarioWithRolesResponseDTO = {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  roles: string[];
  cpf: string | null;
  anamnese: string | null;
  cref: string | null;
};

export type ReqCreateUserDTO = {
  nome: string;
  sexo: string;
  dataNascimento: string;
  email: string;
  cref: string;
  telefone: {
    pais: number;
    ddd: number;
    numero: number;
  };
};

export type ResCadastrarPersonalDTO = {
  id: number;
  nome: string;
  sexo: string;
  dataNascimento: string;
  email: string;
  ativo: boolean;
};
