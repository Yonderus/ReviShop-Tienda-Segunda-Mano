import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Hash bcrypt de una contraseña. Lo usan el seed y el service de usuarios: las dos con las mismas rondas. */
export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
