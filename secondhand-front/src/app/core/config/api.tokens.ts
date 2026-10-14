import { HttpContextToken } from '@angular/common/http';

/** El error se muestra en la propia pantalla (ErrorState), no en un modal. */
export const SKIP_ERROR_ALERT = new HttpContextToken<boolean>(() => false);

/** La pantalla ya muestra skeletons, así que no se enciende el indicador global. */
export const SKIP_GLOBAL_LOADER = new HttpContextToken<boolean>(() => false);

/** Operación que el usuario espera de forma activa (guardar, borrar, restaurar): muestra el spinner bloqueante. */
export const BLOCKING_REQUEST = new HttpContextToken<boolean>(() => false);

/** Códigos HTTP que el llamador pinta en línea (p. ej. en el formulario) en lugar de en un modal. */
export const INLINE_ERROR_STATUSES = new HttpContextToken<readonly number[]>(() => []);
