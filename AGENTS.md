# AGENTS.md

## Tech Stack
- **Framework:** Expo (managed workflow with `expo-router` file-based routing in `app/`), React Native, TypeScript (strict mode).
- **Data & Networking:** `@tanstack/react-query`, `axios` (`src/services/api.ts`), `@stomp/stompjs` (`src/services/webSocketService.ts`).
- **Environment:** Nix/devenv (`devenv.nix`) and Node (see `package.json` `engines`).
- **Version-Specific Docs:** Do not assume static framework versions. Check `package.json` for the current `expo` SDK major version and reference `https://docs.expo.dev/versions/v<MAJOR>.0.0/` when adding or modifying Expo SDK APIs.

## Commands
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`)
- **Check Expo dependency versions:** `npm run check:expo` (`expo install --check`)
- **Full CI verification:** `npm run ci` (runs `typecheck`, `check:expo`, and `build:web`)
- **Start dev server:** `npm run start` (or `npm run start-usb`, `npm run web`, `npm run android`, `npm run ios`)

Always run `npm run typecheck` to verify TypeScript changes before finishing a task.

## Project Structure & Non-Obvious Conventions
- `app/`: Expo Router screens and layouts:
  - `app/(auth)/`: Unauthenticated flows (`login`, `register`, `forgot-password`, `anamnesis`).
  - `app/(app)/(tabs)/`: Main authenticated tab screens (`dashboard`, `schedule`, `personal-schedule`, `plans`, `requests`, `users`, `more`, etc.).
  - `app/(app)/(edit-user)/`: Profile, address, security, and anamnesis editing flows.
- `src/services/`: Core infrastructure services (`api.ts` Axios instance + 401 interceptor + token storage, `authService.ts`, `notificationService.ts`, `webSocketService.ts`, `verifyRole.ts`).
- `src/constants/`: **Domain API endpoint wrappers** (`user.ts`, `schedule.ts`, `personal.ts`, `products.ts`, `dashboard.ts`, `anamnesis.ts`, `address.ts`, `admin.ts`, `overview.ts`) as well as status constants (`cardStatus.ts`). Put new domain REST calls here using `api` from `src/services/api.ts`.
- `src/models/`: TypeScript DTOs and domain interfaces (`user.ts`, `schedule.ts`, `personal.ts`, `products.ts`, etc.).
- `src/contexts/`: Global React contexts (`AuthContext.tsx`, `NotificationContext.tsx`).
- `src/components/`: Reusable UI components and `src/components/modals/` for modal dialogs. Use platform-specific extensions (e.g., `.web.tsx`) when web requires a separate implementation.
- `src/utils/`: Formatting, input masks, and validation helpers in Portuguese (`formatacao.ts`, `mascara.ts`, `validacao.ts`).

## Path Aliases
Configured in both `tsconfig.json` and `babel.config.js`:
- `@components/*` -> `./src/components/*`
- `@services/*` -> `./src/services/*`
- `@models/*` -> `./src/models/*`
- `@constants/*` -> `./src/constants/*`
- `@utils/*` -> `./src/utils/*`

*(Note: `@screens/*`, `@hooks/*`, and `@assets/*` are aliased to `./src/*` in config, though static assets currently live in root `./assets/`).*

## Guardrails & Boundaries
- **Installing packages:** Always use `npx expo install <package>` when adding Expo or React Native libraries so versions match the active Expo SDK in `package.json`.
- **API calls:** Never hardcode backend URLs or create separate `axios` instances. Always import `api` from `src/services/api.ts` (which resolves `EXPO_PUBLIC_API_HOST`, `hostUri`, or Android emulator `10.0.2.2:8080/api` automatically and attaches the `Bearer` token).
- **Backend payloads & copy:** Backend DTO fields, API endpoints (`/usuarios`, `/alunos`, `/agendamentos`, etc.), and user-facing UI strings are in **Portuguese (pt-BR)**. Preserve exact field names from `src/models/`.
- **Navigation:** Use `expo-router` (`useRouter`, `Link`, `Stack`, `Tabs`) for screen navigation rather than creating standalone `@react-navigation` containers.
- **State management:** Use `@tanstack/react-query` for server state and React Context (`src/contexts/`) for global app state. Do not introduce Redux, Zustand, or other state libraries.
