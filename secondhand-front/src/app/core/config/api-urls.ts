import { environment } from '../../../environments/environment';

/**
 * ¿Va esta petición a nuestra API (el gateway, que reparte entre la tienda y la IA)? Solo a ella se le manda la
 * cookie (`withCredentials`) y solo de ella se exige el formato `{ success, data }`. Nunca a otros dominios.
 */
export const isOwnApiUrl = (url: string): boolean => url.startsWith(environment.apiUrl);
