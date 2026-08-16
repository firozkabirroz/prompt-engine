const GEMINI_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GROQ_KEY = (process.env.GROQ_API_KEY || "").trim();
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
].filter((m, i, arr) => m && arr.indexOf(m) === i);

const GROQ_MODELS = [
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter((m, i, arr) => m && arr.indexOf(m) === i);

function hasGemini() {
  return Boolean(GEMINI_KEY && GEMINI_KEY !== "your_api_key_here");
}

function hasGroq() {
  return Boolean(GROQ_KEY && GROQ_KEY !== "your_api_key_here");
}

function anyKeyConfigured() {
  return hasGemini() || hasGroq();
}

function isRetryable(err) {
  const status = err.status || 0;
  const msg = (err.message || "").toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("rate limit") ||
    msg.includes("resource exhausted") ||
    msg.includes("abort") ||
    msg.includes("timeout")
  );
}

async function groqGenerate(systemPrompt, userText, model) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Groq API error (HTTP ${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const text = (data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("Groq returned an empty response");
  return text;
}

async function geminiGenerate(systemPrompt, userText, model) {
  const res = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API error (HTTP ${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

function estimateTokens(text) {
  return { count: Math.max(1, Math.ceil(text.length / 4)), exact: false };
}

async function countTokens(text) {
  if (!hasGemini()) return estimateTokens(text);
  const model = GEMINI_MODELS[0] || "gemini-flash-lite-latest";
  try {
    const res = await fetch(
      `${GEMINI_BASE}/${model}:countTokens?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text }] }],
        }),
      }
    );
    const data = await res.json();
    if (res.ok && typeof data.totalTokens === "number") {
      return { count: data.totalTokens, exact: true };
    }
  } catch (_) {
    // fall through
  }
  return estimateTokens(text);
}

async function generate(systemPrompt, userText) {
  const attempts = [];
  if (hasGroq()) {
    for (const model of GROQ_MODELS) {
      attempts.push({ provider: "groq", model, run: () => groqGenerate(systemPrompt, userText, model) });
    }
  }
  if (hasGemini()) {
    for (const model of GEMINI_MODELS) {
      attempts.push({
        provider: "gemini",
        model,
        run: () => geminiGenerate(systemPrompt, userText, model),
      });
    }
  }

  if (attempts.length === 0) {
    const err = new Error("No AI API key configured");
    err.status = 500;
    throw err;
  }

  let lastErr;
  for (const attempt of attempts) {
    try {
      const output = await attempt.run();
      return { output, provider: attempt.provider, model: attempt.model };
    } catch (err) {
      lastErr = err;
      console.warn(
        `AI fallback after ${attempt.provider}/${attempt.model}: ${err.message}`
      );
      if (!isRetryable(err) && attempts.indexOf(attempt) === attempts.length - 1) {
        throw err;
      }
    }
  }
  throw lastErr;
}

function statusInfo() {
  const providers = [];
  if (hasGroq()) providers.push("groq");
  if (hasGemini()) providers.push("gemini");
  const model = hasGroq()
    ? GROQ_MODELS[0]
    : GEMINI_MODELS[0] || "gemini-flash-lite-latest";
  return {
    keyConfigured: anyKeyConfigured(),
    providers,
    model,
  };
}

module.exports = {
  anyKeyConfigured,
  generate,
  countTokens,
  statusInfo,
};
