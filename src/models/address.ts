export type AddressCep = {
  id?: string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  cidade?: {
    nome?: string;
    estado?: {
      sigla?: string;
    };
  };
};

export type Address = {
  id?: number;
  tipo: string;
  numero: string;
  complemento?: string;
  logradouro?: string;
  bairro?: string;
  padrao?: boolean;
  cep?: AddressCep;
};

export type UserAddress = {
  id: number;
  numero: string;
  complemento?: string;
  unidade?: string;
  tipo: string;
  cep: {
    id?: string;
    cep?: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  };
};
