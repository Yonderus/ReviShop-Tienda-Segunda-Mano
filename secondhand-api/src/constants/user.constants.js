/** Estado de la cuenta: un usuario suspendido no puede vender ni aparece como vendedor. */
export const USER_STATUS = Object.freeze({
  PENDING: "pending",
  VERIFIED: "verified",
  SUSPENDED: "suspended",
});
export const USER_STATUSES = Object.freeze(Object.values(USER_STATUS));
