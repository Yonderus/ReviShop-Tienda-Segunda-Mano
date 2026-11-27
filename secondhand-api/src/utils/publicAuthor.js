import { FORMER_USER_NAME } from "../constants/review.constants.js";
import { USER_STATUS } from "../constants/user.constants.js";

/**
 * Quien escribió algo público (una valoración, una pregunta): su nombre y slug si su cuenta sigue en pie; si no
 * (suspendido, desactivado o borrado), «Usuario de Revishop» sin enlace. Nunca el email.
 */
export function publicAuthor(user) {
  const gone = !user?.name || user.deletedAt || !user.isActive || user.status === USER_STATUS.SUSPENDED;
  return gone ? { name: FORMER_USER_NAME, slug: null } : { name: user.name, slug: user.slug };
}
