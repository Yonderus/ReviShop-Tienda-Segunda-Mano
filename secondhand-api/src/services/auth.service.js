import { AUTH_MESSAGES, REFRESH_REVOKE_REASON, REVOKE_REASON } from "../constants/auth.constants.js";
import { revokedTokenRepository } from "../repositories/revokedToken.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { UnauthorizedError } from "../utils/AppError.js";
import { createToken, isTokenExpired, verifyToken } from "../utils/jwt.js";
import { hashPassword, needsRehash, verifyPassword } from "../utils/password.js";
import { refreshTokenService } from "./refreshToken.service.js";
import { userService } from "./user.service.js";

/*
 * Login, sesión, renovación y logout. No tiene modelo propio: usa User (la cuenta), RevokedToken (la blacklist de
 * access tokens) y, a través de refreshTokenService, RefreshToken (las sesiones largas).
 *
 * Dos tokens: el access (JWT corto, en cada petición) y el refresh (opaco, solo para pedir otro access). Este
 * service los devuelve como texto; ponerlos en cookies es cosa del controller.
 */

/** El access del usuario con su rol actual. */
const accessFor = (user, role) => createToken({ id: user._id, email: user.email, role: role.slug });

// Si el email no existe, se compara igualmente con un hash cualquiera: así la respuesta tarda lo mismo y
// no se puede adivinar qué emails están registrados midiendo el tiempo.
let dummyHash = null;
const getDummyHash = async () => (dummyHash ??= await hashPassword("contraseña-que-no-es-de-nadie"));

export const authService = {
  /**
   * Email inexistente o contraseña mala → 401 con el mismo mensaje (no se revela qué emails existen).
   * Contraseña buena pero la cuenta no puede entrar (inactiva, suspendida, en la papelera o con el rol
   * roto) → 403. Si todo va bien: actualiza `lastLoginAt`, pasa a Argon2 una contraseña antigua, abre una sesión de
   * refresh nueva y devuelve `{ accessToken, refresh, user }`.
   */
  async login({ email, password }, { userAgent = null } = {}) {
    const user = await userRepository.findForLogin(email);
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : (await verifyPassword(password, await getDummyHash()), false);
    if (!valid) throw new UnauthorizedError(AUTH_MESSAGES.BAD_CREDENTIALS);

    const role = await userService.assertCanLogIn(user);

    const changes = { lastLoginAt: new Date() };
    if (needsRehash(user.passwordHash)) changes.passwordHash = await hashPassword(password);
    await userRepository.updateById(user._id, changes);

    const refresh = await refreshTokenService.issue(user._id, { userAgent });
    return { accessToken: accessFor(user, role), refresh, user: await this.me(user._id) };
  },

  /**
   * Renovar la sesión: cambia el refresh por otro (rotación, ver refreshTokenService.rotate) y emite un access nuevo
   * con el rol que tenga ahora el usuario. Errores: 401 (sin refresh, inválido, caducado, reutilizado o cuenta que ya
   * no puede entrar) o 409 (dos pestañas a la vez: la otra ya lo ha renovado).
   */
  async refresh(token, { userAgent = null } = {}) {
    const { refresh, user, role } = await refreshTokenService.rotate(token, { userAgent });
    return { accessToken: accessFor(user, role), refresh, user: await this.me(user._id) };
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

  /**
   * Cierra la sesión de este navegador: el access (si es válido) va a la blacklist hasta que habría caducado y la
   * sesión de refresh se revoca entera. Idempotente: dos veces, o sin tokens, no falla.
   */
  async logout({ user = null, auth = null, refreshToken = null } = {}) {
    if (user && auth) {
      await revokedTokenRepository.revoke({ jti: auth.jti, userId: user.id, reason: REVOKE_REASON.LOGOUT, expiresAt: new Date(auth.exp * 1000) });
    }
    await refreshTokenService.revokeFamilyOf(refreshToken, REFRESH_REVOKE_REASON.LOGOUT);
  },

  /**
   * Cierra todas las sesiones del usuario, en todos los dispositivos: revoca todos sus refresh y marca
   * `tokensValidAfter`, con lo que los access que tengan otros navegadores dejan de valer al momento. El access de
   * esta petición va además a la blacklist (si se emitió en este mismo segundo, `tokensValidAfter` no lo alcanza).
   */
  async logoutAll(user, auth) {
    await refreshTokenService.revokeAllForUser(user.id, REFRESH_REVOKE_REASON.LOGOUT_ALL);
    await userRepository.updateById(user.id, { tokensValidAfter: new Date() });
    await revokedTokenRepository.revoke({ jti: auth.jti, userId: user.id, reason: REVOKE_REASON.LOGOUT, expiresAt: new Date(auth.exp * 1000) });
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

    // Con precisión de milisegundos (`issuedAtMs`): un token emitido justo antes de cerrar las sesiones (aunque sea
    // en el mismo segundo) ya no vale, y uno emitido después, sí. Los tokens anteriores a `issuedAtMs` usan `iat`.
    const issuedAt = payload.issuedAtMs ?? payload.iat * 1000;
    if (user.tokensValidAfter && issuedAt < user.tokensValidAfter.getTime()) {
      throw new UnauthorizedError(AUTH_MESSAGES.TOKEN_REVOKED);
    }

    return {
      user: { id: String(user._id), email: user.email, name: user.name, role: role.slug },
      auth: { jti: payload.jti, exp: payload.exp },
    };
  },
};
