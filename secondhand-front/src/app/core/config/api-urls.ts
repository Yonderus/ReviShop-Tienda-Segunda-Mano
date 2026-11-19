import { environment } from '../../../environments/environment';

/** Las APIs propias: la de la tienda y la del servicio de IA (que en producción comparten origen). */
const OWN_API_URLS = [...new Set([environment.apiUrl, environment.aiApiUrl])];

/**
 * ¿Va esta petición a una API nuestra? Solo a ellas se les manda la cookie (`withCredentials`) y solo de ellas
 * se exige el formato `{ success, data }`. Nunca a otros dominios.
 */
export const isOwnApiUrl = (url: string): boolean => OWN_API_URLS.some((base) => url.startsWith(base));
