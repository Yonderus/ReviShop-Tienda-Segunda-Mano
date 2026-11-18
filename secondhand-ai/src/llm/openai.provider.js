import OpenAI from "openai";
import { env } from "../config/env.js";
import { AI_BASE_URLS, AI_TEMPERATURE } from "../constants/ai.constants.js";

/*
 * OpenRouter y xAI (Grok) hablan la misma API que OpenAI: un único cliente con el SDK `openai` y la `baseURL`
 * del proveedor. Cambiar de proveedor o de modelo es cambiar el `.env`.
 */

let client = null;

function getClient() {
  if (client) return client;
  client = new OpenAI({
    apiKey: env.aiApiKey,
    baseURL: env.AI_BASE_URL ?? AI_BASE_URLS[env.AI_PROVIDER],
    timeout: env.AI_TIMEOUT_MS,
    // Sin reintentos automáticos: cada reintento cuesta dinero y alarga la espera del usuario, que ya tiene un
    // botón de "Reintentar".
    maxRetries: 0,
    // OpenRouter usa estas dos cabeceras (opcionales) para identificar la aplicación en su panel.
    defaultHeaders:
      env.AI_PROVIDER === "openrouter" ? { "HTTP-Referer": env.corsOrigins[0], "X-Title": "Revishop" } : undefined,
  });
  return client;
}

/**
 * @param {{ messages: object[], tools?: object[], signal?: AbortSignal }} input
 * @returns {Promise<{ content: string, toolCalls: object[], usage: object | null, model: string }>}
 */
export async function complete({ messages, tools, signal }) {
  const response = await getClient().chat.completions.create(
    {
      model: env.AI_MODEL,
      messages,
      max_tokens: env.AI_MAX_TOKENS,
      temperature: AI_TEMPERATURE,
      ...(tools?.length && { tools, tool_choice: "auto" }),
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
