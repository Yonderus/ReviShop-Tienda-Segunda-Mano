import OpenAI from "openai";
import { env } from "../config/env.js";
import { AI_BASE_URLS, AI_TEMPERATURE } from "../constants/ai.constants.js";

/*
 * Groq, OpenRouter y xAI (Grok) hablan la misma API que OpenAI: un único cliente con el SDK `openai` y la
 * `baseURL` del proveedor. Cambiar de proveedor o de modelo es cambiar el `.env`.
 */

/** Opciones del cliente según el proveedor elegido (exportado para poder comprobarlas sin hacer peticiones). */
export function clientOptions() {
  return {
    apiKey: env.aiApiKey,
    baseURL: env.AI_BASE_URL ?? AI_BASE_URLS[env.AI_PROVIDER],
    timeout: env.AI_TIMEOUT_MS,
    // Sin reintentos automáticos: cada reintento cuesta dinero (o cupo del plan gratuito) y alarga la espera del
    // usuario, que ya tiene un botón de "Reintentar".
    maxRetries: 0,
    // OpenRouter usa estas dos cabeceras (opcionales) para identificar la aplicación en su panel.
    defaultHeaders:
      env.AI_PROVIDER === "openrouter" ? { "HTTP-Referer": env.corsOrigins[0], "X-Title": "Revishop" } : undefined,
  };
}

let client = null;

function getClient() {
  client ??= new OpenAI(clientOptions());
  return client;
}

/**
 * @param {{ messages: object[], tools?: object[], json?: boolean, signal?: AbortSignal }} input
 *   `json`: pide al modelo un objeto JSON (modo JSON de la API de OpenAI, que Groq también admite). Aun así, quien
 *   lo pide valida la respuesta: no todos los modelos lo respetan igual.
 * @returns {Promise<{ content: string, toolCalls: object[], usage: object | null, model: string }>}
 */
export async function complete({ messages, tools, json, signal }) {
  const response = await getClient().chat.completions.create(
    {
      model: env.AI_MODEL,
      messages,
      max_tokens: env.AI_MAX_TOKENS,
      temperature: AI_TEMPERATURE,
      ...(tools?.length && { tools, tool_choice: "auto" }),
      ...(json && { response_format: { type: "json_object" } }),
    },
    { signal },
  );

  const message = response.choices?.[0]?.message ?? {};
  return {
    content: (message.content ?? "").trim(),
    toolCalls: message.tool_calls ?? [],
    usage: response.usage ?? null,
    model: response.model ?? env.AI_MODEL,
  };
}
