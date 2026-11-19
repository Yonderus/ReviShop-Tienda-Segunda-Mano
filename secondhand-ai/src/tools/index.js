import { z } from "zod";
import { AppError } from "../utils/AppError.js";
import { getProductTool } from "./getProduct.tool.js";
import { listCategoriesTool } from "./listCategories.tool.js";
import { listLocationsTool } from "./listLocations.tool.js";
import { searchProductsTool } from "./searchProducts.tool.js";

/*
 * Herramientas del agente. TODAS son de solo lectura y solo usan los endpoints públicos de la tienda
 * (`/api/shop/*`), sin la cookie del usuario: aunque alguien engañe al modelo, lo peor que puede pasar es una
 * búsqueda. Cada una tiene un esquema Zod que sirve para dos cosas: validar los argumentos que manda el modelo y
 * generar el JSON Schema que se le enseña (una sola fuente de verdad).
 */
const TOOLS = [searchProductsTool, getProductTool, listCategoriesTool, listLocationsTool];
const BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

const toJsonSchema = (schema) => {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema, { io: "input" });
  return jsonSchema;
};

/** Definiciones en el formato de la API de OpenAI (`tools`). */
export const TOOL_DEFINITIONS = Object.freeze(
  TOOLS.map((tool) => ({
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: toJsonSchema(tool.schema) },
  })),
);

/** Los modelos a veces mandan `null` en lo que no usan: se trata como si no estuviera. */
const withoutNulls = (args) =>
  args && typeof args === "object" && !Array.isArray(args)
    ? Object.fromEntries(Object.entries(args).filter(([, value]) => value !== null))
    : args;

/**
 * Ejecuta una llamada del modelo. Nunca lanza por culpa del modelo: si se equivoca (herramienta que no existe,
 * JSON roto, argumentos no válidos, un 404 de la API…) se le devuelve `{ error }` para que corrija o lo diga.
 * Solo se propagan los fallos del sistema (la API caída → 503), que no puede arreglar el modelo.
 *
 * @param {{ function: { name: string, arguments: string } }} call
 * @param {{ products: object[], shopQuery: object | null }} context
 */
export async function runTool(call, context) {
  const tool = BY_NAME.get(call.function?.name);
  if (!tool) return { error: `La herramienta "${call.function?.name}" no existe. Usa: ${[...BY_NAME.keys()].join(", ")}` };

  let raw;
  try {
    raw = JSON.parse(call.function.arguments || "{}");
  } catch {
    return { error: "Los argumentos no son un JSON válido" };
  }

  const parsed = tool.schema.safeParse(withoutNulls(raw));
  if (!parsed.success) {
    return {
      error: "Argumentos no válidos",
      details: parsed.error.issues.map((issue) => `${issue.path.join(".") || "args"}: ${issue.message}`),
    };
  }

  try {
    return await tool.run(parsed.data, context);
  } catch (error) {
    if (error instanceof AppError && error.statusCode < 500) return { error: error.message };
    throw error;
  }
}
