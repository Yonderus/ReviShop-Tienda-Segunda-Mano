/** Estado de la cuenta: un usuario suspendido no puede vender ni aparece como vendedor. */
export const USER_STATUS = Object.freeze({
  PENDING: "pending",
  VERIFIED: "verified",
  SUSPENDED: "suspended",
});
export const USER_STATUSES = Object.freeze(Object.values(USER_STATUS));

/** La comprueban el validador de usuarios y el de entorno (contraseña del seed). bcrypt ignora más allá de 72 bytes. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
