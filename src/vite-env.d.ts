/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL do client Axios. Default: "/api" (ver `src/shared/api/http.ts`). */
  readonly VITE_API_BASE_URL?: string
  /** URL do servidor Socket.IO simulado (ver `src/features/realtime/client/socket.ts`). */
  readonly VITE_SOCKET_URL?: string
  /**
   * Ativa a camada de mocks MSW (seção 6: "ativada por configuração e
   * estar disponível no build de demonstração"). Valores aceitos: "true" | "false".
   */
  readonly VITE_ENABLE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
