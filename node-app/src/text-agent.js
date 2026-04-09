function buildPrompt({ theme, tone, avoid_direct_quotes, index }) {
  const base = `Tema: ${theme}. Tom: ${tone}. Versao: v${index + 1}.`;
  const quoteRule = avoid_direct_quotes
    ? "Nao use citacoes diretas de autores."
    : "Pode usar citacoes diretas se fortalecer a mensagem, com atribuicao explicita.";

  return `${base} Gere um texto curto e um texto medio complementares. ${quoteRule}`;
}

function fallbackTextPair(input, index) {
  const tag = input.tone === "agressivo" ? "Disciplina" : "Clareza";
  const short = `${tag} nao nasce pronta: ela e forjada quando voce escolhe agir apesar do desconforto.`;
  const medium = `v${index + 1}: Sobre ${input.theme}, lembre que constancia vence impulso. O desconforto inicial e o preco da transformacao, e a repeticao consciente consolida identidade.`;
  return { short, medium };
}

function ensureAttribution(text) {
  if (/"[^"]+"\s*-\s*[A-Za-z]/.test(text)) return text;
  return `${text} - Marco Aurelio`;
}

function fail(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

async function callOpenRouter(config, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.textTimeoutMs);
  try {
    const response = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openRouterApiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.openRouterModel,
        messages: [
          {
            role: "system",
            content:
              "Retorne JSON valido no formato {\"short\": string, \"medium\": string}.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter respondeu com status ${response.status}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia do OpenRouter");

    const parsed = JSON.parse(content);
    if (!parsed.short || !parsed.medium) throw new Error("Resposta sem short/medium");

    return parsed;
  } catch (error) {
    if (error?.name === "AbortError") {
      fail("Timeout remoto de texto excedido no OpenRouter.", 504);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function generatePairWithRetry(config, input, index) {
  const prompt = buildPrompt({ ...input, index });

  if (!config.openRouterApiKey) {
    return fallbackTextPair(input, index);
  }

  let attempt = 0;
  while (attempt <= config.textRetries) {
    try {
      const pair = await callOpenRouter(config, prompt);
      return pair;
    } catch (error) {
      if (error?.statusCode === 504) throw error;
      if (attempt === config.textRetries) throw error;
      attempt += 1;
    }
  }

  return fallbackTextPair(input, index);
}

export async function generateStoicTexts(config, input, variationCount = 3) {
  const items = [];

  for (let index = 0; index < variationCount; index += 1) {
    const pair = await generatePairWithRetry(config, input, index);
    let short = pair.short;
    let medium = pair.medium;

    if (!input.avoid_direct_quotes && short.includes('"')) {
      short = ensureAttribution(short);
    }
    if (!input.avoid_direct_quotes && medium.includes('"')) {
      medium = ensureAttribution(medium);
    }

    if (input.avoid_direct_quotes) {
      short = short.replace(/"[^"]+"\s*-\s*[A-Za-z\s\.]+/g, "").trim();
      medium = medium.replace(/"[^"]+"\s*-\s*[A-Za-z\s\.]+/g, "").trim();
    }

    items.push({
      version: `v${index + 1}`,
      short_text: short,
      medium_text: medium,
      status: "pending",
      rejection_history: [],
    });
  }

  return {
    model: config.openRouterApiKey ? config.openRouterModel : "local-fallback",
    items,
  };
}
