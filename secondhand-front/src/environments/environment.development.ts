export const environment = {
  production: false,
  /**
   * El API Gateway: la única puerta del front. Reparte `/api/ai` al servicio de IA (3001) y el resto de `/api` a la
   * API de la tienda (3000), y pone CORS.
   */
  apiUrl: 'http://localhost:4000/api',
  requestTimeoutMs: 10_000,
  /** Los asistentes de IA tardan más que el resto (el modelo puede necesitar varios segundos). */
  aiRequestTimeoutMs: 35_000,
};
