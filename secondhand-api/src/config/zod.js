import { z } from "zod";

// Los mensajes de error por defecto de Zod, en español ("Entrada inválida: se esperaba texto, recibido número").
// Solo se ven donde un esquema no tiene un mensaje propio. Se importa lo primero en server.js.
z.config(z.locales.es());
