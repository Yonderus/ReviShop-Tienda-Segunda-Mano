import { z } from "zod";

// Los mensajes de error por defecto de Zod, en español. Solo se ven donde un esquema no tiene uno propio.
// Se importa lo primero en server.js (igual que en la API).
z.config(z.locales.es());
