export type Roles = 'aluno' | 'personal' | 'admin';
export type UserType = Roles;

export type UserDTO = {
  id?: string;
  nome: string;
  sexo: string;
  dataNascimento: string;
  email: string;
  senha: string;
  cpf?: string;
  telefone?: {
    ddd: string;
    numero: string;
    pais: string;
  };
};

export type UpdateUserDTO = {
  nome: string;
  sexo: string;
  email: string;
  telefone?: {
    ddd: string;
    numero: string;
    pais: string;
  };
  telefones?: [
    {
      numero: string;
      ddd: string;
      id: number;
    }
  ];
};

export type AuthUserData = {
  id: string;
  nome: string;
  email: string;
  roles: string[];
};

export type AuthResponseDTO = {
  autentificado: boolean;
  ativoAnamnese?: boolean;
  user?: AuthUserData;
};
