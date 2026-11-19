export const environment = {
  production: true,
  apiUrl: '/api',
  /** En producción todo va por el mismo origen (el gateway reparte `/api/ai` al servicio de IA). */
  aiApiUrl: '/api',
  requestTimeoutMs: 10_000,
  aiRequestTimeoutMs: 35_000,
};
