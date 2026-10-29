/** Estado de la cuenta: un usuario suspendido no puede vender ni aparece como vendedor. */
export const USER_STATUS = Object.freeze({
  PENDING: "pending",
  VERIFIED: "verified",
  SUSPENDED: "suspended",
});
export const USER_STATUSES = Object.freeze(Object.values(USER_STATUS));

/**
 * Datos del perfil (colección `profiles`), no de la cuenta. El service de usuarios los separa de los de
 * `User` al crear y editar, y la migración los mueve de los usuarios antiguos a su perfil.
 */
export const PROFILE_FIELDS = Object.freeze(["phone", "location", "bio"]);

/** La comprueban el validador de usuarios y el de entorno (contraseña del seed). bcrypt ignora más allá de 72 bytes. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
