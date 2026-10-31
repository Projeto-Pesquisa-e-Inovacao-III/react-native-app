# CSF Treinamentos - Aplicativo Mobile e Web

Aplicação multiplataforma (Android, iOS e Web) desenvolvida em React Native com Expo para a plataforma CSF Treinamentos. O sistema centraliza o gerenciamento de agendamentos de aulas, planos e pacotes de treinamento, fichas de anamnese e controle de presença para alunos, personal trainers e administradores.

## Sobre o Projeto

O aplicativo atende a três perfis de acesso distintos:

- **Aluno**: gerenciamento de agendamentos de aulas (presencial, funcional e residencial), contratação e consulta de planos e pacotes, preenchimento de ficha de anamnese, cadastro de endereços, validação de presença via QR Code e solicitação de agendamentos por comando de voz com auxílio de inteligência artificial.
- **Personal Trainer**: controle de disponibilidade de horários, gestão de solicitações de aulas, acompanhamento de agenda, registro de conclusão ou ausência de aulas (incluindo leitura de QR Code e cronômetro de aula) e visualização de histórico.
- **Administrador**: painel de indicadores (dashboard) com métricas operacionais, gestão de usuários, cadastro de personal trainers e administração de pacotes e planos.

## Tecnologias Principais

- **React Native** (0.88.0) e **React** (19.3.0)
- **Expo** (~58.0.21) e **Expo Router** (~58.0.28) para roteamento baseado em arquivos
- **TypeScript** (~6.0.3)
- **TanStack React Query** para gerenciamento de estado assíncrono e cache de requisições
- **Axios** para comunicação com a API REST
- **Jest** para execução de testes automatizados

## Pré-requisitos

Antes de iniciar a configuração do ambiente, certifique-se de ter instalado:

- **Node.js**: versão `20.19.0` ou superior (conforme definido em `package.json`)
- **npm**: gerenciador de pacotes padrão do Node.js
- **Android SDK / Android Studio** (opcional, necessário para compilação nativa Android local)
- **Xcode** (opcional, apenas em macOS para compilação iOS local)
- **Backend da aplicação**: serviço da API executando (por padrão na porta `8080`)

Caso utilize **Nix** com **devenv**, o projeto disponibiliza o arquivo `devenv.nix`, que configura automaticamente o Node.js, JDK 17 e o Android SDK/NDK necessários.

## Configuração do Ambiente

### 1. Instalar dependências

No diretório raiz do projeto (`react-native-app`), execute:

```bash
npm install
```

*(Opcional)* Se estiver utilizando `devenv`, ative o shell do ambiente antes de instalar ou executar o projeto:

```bash
devenv shell
```

### 2. Configurar variáveis de ambiente

Crie ou edite o arquivo `.env` na raiz do projeto para apontar para o endereço IP ou hostname onde o backend está em execução:

```env
EXPO_PUBLIC_API_HOST=192.168.1.100
```

A aplicação consome a API no formato `http://<EXPO_PUBLIC_API_HOST>:8080/api`. Caso a variável `EXPO_PUBLIC_API_HOST` não seja informada, o cliente HTTP tentará resolver o host automaticamente na seguinte ordem:

1. Host derivado do `hostUri` do Expo em tempo de desenvolvimento.
2. `10.0.2.2` quando executado em emulador Android sem `hostUri`.
3. `localhost` nos demais cenários.

## Como Executar o Projeto

### Iniciar o servidor de desenvolvimento (Metro Bundler)

```bash
npm run start
```

Para conexões via cabo USB (`adb reverse`), utilize:

```bash
npm run start-usb
```

### Executar no Android (Build Nativo)

Compila e instala o aplicativo em um emulador ou dispositivo físico conectado:

```bash
npm run android
```

### Executar no iOS (Build Nativo - macOS)

```bash
npm run ios
```

### Executar na Web

```bash
npm run web
```

## Scripts de Verificação e Qualidade

O projeto conta com scripts utilitários para validação de tipos, integridade de pacotes e testes:

- **Verificação de tipos (TypeScript)**:
  ```bash
  npm run typecheck
  ```
- **Testes unitários (Jest)**:
  ```bash
  npm run test
  ```
- **Verificação de compatibilidade de dependências Expo**:
  ```bash
  npm run check:expo
  ```
- **Exportação de build Web**:
  ```bash
  npm run build:web
  ```
- **Pipeline de validação completa (CI)**:
  ```bash
  npm run ci
  ```

## Estrutura de Diretórios

- `app/`: rotas e telas da aplicação estruturadas com Expo Router (`(auth)` para autenticação e `(app)` para rotas autenticadas).
- `src/components/`: componentes reutilizáveis de interface, ícones e modais.
- `src/constants/`: funções de integração com endpoints da API e constantes de domínio.
- `src/contexts/`: contextos globais do React (`AuthContext` e `NotificationContext`).
- `src/models/`: definições de tipos e interfaces TypeScript (DTOs).
- `src/services/`: configuração do cliente HTTP (`api.ts`), autenticação, notificações e reconhecimento de voz.
- `src/utils/`: funções utilitárias de formatação, máscaras, moeda e validação, acompanhadas de testes unitários.
- `assets/`: recursos estáticos como ícones e imagens.
