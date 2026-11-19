export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  /**
   * Servicio de IA (asistentes). Hasta que exista el API Gateway va directo a su puerto; con el gateway, todo irá
   * por `apiUrl`. La cookie de la sesión (`Path=/api`) también llega aquí: las cookies no dependen del puerto.
   */
  aiApiUrl: 'http://localhost:3001/api',
  requestTimeoutMs: 10_000,
  /** Los asistentes de IA tardan más que el resto (el modelo puede necesitar varios segundos). */
  aiRequestTimeoutMs: 35_000,
};
