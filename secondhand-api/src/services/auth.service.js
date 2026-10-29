import { AUTH_MESSAGES, REVOKE_REASON } from "../constants/auth.constants.js";
import { revokedTokenRepository } from "../repositories/revokedToken.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { UnauthorizedError } from "../utils/AppError.js";
import { createToken, isTokenExpired, verifyToken } from "../utils/jwt.js";
import { hashPassword, needsRehash, verifyPassword } from "../utils/password.js";
import { userService } from "./user.service.js";

/*
 * Login, sesión y logout. No tiene modelo propio: usa User (la cuenta) y RevokedToken (la blacklist).
 */

// Si el email no existe, se compara igualmente con un hash cualquiera: así la respuesta tarda lo mismo y
// no se puede adivinar qué emails están registrados midiendo el tiempo.
let dummyHash = null;
const getDummyHash = async () => (dummyHash ??= await hashPassword("contraseña-que-no-es-de-nadie"));

export const authService = {
  /**
   * Email inexistente o contraseña mala → 401 con el mismo mensaje (no se revela qué emails existen).
   * Contraseña buena pero la cuenta no puede entrar (inactiva, suspendida, en la papelera o con el rol
   * roto) → 403. Si todo va bien: actualiza `lastLoginAt`, pasa a Argon2 una contraseña antigua y devuelve
   * `{ token, user }`.
   */
  async login({ email, password }) {
    const user = await userRepository.findForLogin(email);
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : (await verifyPassword(password, await getDummyHash()), false);
    if (!valid) throw new UnauthorizedError(AUTH_MESSAGES.BAD_CREDENTIALS);

    const role = await userService.assertCanLogIn(user);

    const changes = { lastLoginAt: new Date() };
    if (needsRehash(user.passwordHash)) changes.passwordHash = await hashPassword(password);
    await userRepository.updateById(user._id, changes);

    const token = createToken({ id: user._id, email: user.email, role: role.slug });
    return { token, user: await this.me(user._id) };
  },

  /** El usuario de la sesión, con su perfil. Nunca la contraseña. */
  async me(userId) {
    const { _id, name, slug, email, status, role, phone, location, bio, avatarUrl } = await userService.getById(userId);
    return {
      _id,
      name,
      slug,
      email,
      status,
      role: role ? { name: role.name, slug: role.slug } : null,
      avatarUrl,
      profile: { phone, location, bio },
    };
  },

  /** Apunta el token en la blacklist hasta que habría caducado. Dos veces el mismo token no falla. */
  async logout(user, { jti, exp }) {
    await revokedTokenRepository.revoke({ jti, userId: user.id, reason: REVOKE_REASON.LOGOUT, expiresAt: new Date(exp * 1000) });
  },

  /**
   * Lo que comprueba el middleware de auth en cada petición. Cualquier fallo es un 401:
   * firma o caducidad, blacklist, usuario que ya no puede entrar y tokens anteriores a `tokensValidAfter`.
   * El rol que se devuelve es el de la base de datos, no el del token: si se lo cambiaron, manda el nuevo.
   */
  async authenticate(token) {
    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      throw new UnauthorizedError(isTokenExpired(error) ? AUTH_MESSAGES.TOKEN_EXPIRED : AUTH_MESSAGES.TOKEN_MISSING);
    }

    if (await revokedTokenRepository.isRevoked(payload.jti)) throw new UnauthorizedError(AUTH_MESSAGES.TOKEN_REVOKED);

    const user = await userRepository.findRawById(payload.sub);
    let role;
    try {
      role = await userService.assertCanLogIn(user);
    } catch {
      throw new UnauthorizedError(AUTH_MESSAGES.CANNOT_LOG_IN);
    }

    // `iat` va en segundos: un token emitido en el mismo segundo que el cambio de contraseña sigue valiendo.
    if (user.tokensValidAfter && payload.iat < Math.floor(user.tokensValidAfter.getTime() / 1000)) {
      throw new UnauthorizedError(AUTH_MESSAGES.TOKEN_REVOKED);
    }

    return {
      user: { id: String(user._id), email: user.email, name: user.name, role: role.slug },
      auth: { jti: payload.jti, exp: payload.exp },
    };
  },
};
